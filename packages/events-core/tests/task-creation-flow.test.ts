import { mkdtemp, rm, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { v4 as uuidv4 } from "uuid";

import { createServerEventBus } from "../src/event-bus.js";
import { WorkspaceManager } from "../src/workspace-manager.js";
import { ChatRepository, TaskRepository } from "../src/repositories.js";
import { TaskService } from "../src/task-service.js";
import { SubtaskService } from "../src/subtask-service.js";
import { ChatService } from "../src/chat-service.js";
import {
  ClientCreateTaskCommand,
  ClientEventType,
  ServerEventType,
} from "../src/event-types.js";

// File: task-creation-flow.test.ts
describe("Task Creation and Initialization Flow", () => {
  let tempDir: string;
  let workspaceManager: WorkspaceManager;
  let taskRepo: TaskRepository;
  let chatRepo: ChatRepository;
  let eventBus: ReturnType<typeof createServerEventBus>;

  // Store captured events for assertion
  const capturedEvents: any[] = [];

  beforeAll(async () => {
    // Create temporary directory for the test
    tempDir = await mkdtemp(join(tmpdir(), "event-flow-test-"));

    // Initialize components
    workspaceManager = new WorkspaceManager(tempDir);
    taskRepo = new TaskRepository(workspaceManager);
    chatRepo = new ChatRepository(workspaceManager);
    eventBus = createServerEventBus();

    // Set up event listener to capture all events for testing
    eventBus.subscribeToAllServerEvents((event) => {
      capturedEvents.push(event);
    });

    // Initialize services
    new TaskService(eventBus, taskRepo);
    new SubtaskService(eventBus, taskRepo);
    new ChatService(eventBus, chatRepo);
  });

  afterAll(async () => {
    // Clean up temporary directory after tests
    // await rm(tempDir, { recursive: true, force: true });

    // For debugging: log temp directory location
    console.log(`Test files are in: ${tempDir}`);
  });

  test("should correctly execute task creation and initialization flow", async () => {
    // Clear any previous events
    capturedEvents.length = 0;

    // Generate unique correlation ID for this test
    const correlationId = uuidv4();

    // Create a task command
    const createTaskCommand: ClientCreateTaskCommand = {
      eventType: "CLIENT_CREATE_TASK_COMMAND",
      taskName: "Test Task",
      taskConfig: { testKey: "testValue" },
      timestamp: new Date(),
      correlationId,
    };

    // Emit the create task command
    await eventBus.emit(createTaskCommand);

    // Allow time for all events to be processed
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify the event flow sequence
    const expectedEventFlow = [
      "SERVER_TASK_FOLDER_CREATED",
      "SERVER_TASK_CREATED",
      "SERVER_TASK_LOADED",
      "SERVER_CHAT_CREATED",
      "SERVER_SUBTASK_UPDATED",
      "SERVER_SUBTASK_STARTED",
    ];

    // Extract just the event types in the order they occurred
    const actualEventFlow = capturedEvents.map((event) => event.eventType);

    // Check if all expected events are in the flow
    expect(actualEventFlow).toEqual(expect.arrayContaining(expectedEventFlow));

    // Create snapshot of events in order (just type and relevant data)
    const eventFlowSnapshot = capturedEvents.map((event) => ({
      type: event.eventType,
      taskId: event.taskId ? "TASK_ID" : undefined,
      ...(event.subtaskId && { subtaskId: "SUBTASK_ID" }),
      ...(event.chatId && { chatId: "CHAT_ID" }),
      timestamp: "TIMESTAMP", // Replace with constant for snapshot
    }));

    expect(eventFlowSnapshot).toMatchSnapshot("Event Flow");

    // Create directory and file structure snapshot
    const directoryStructure = await getDirectoryStructure(tempDir);
    expect(directoryStructure).toMatchSnapshot("Directory Structure");
  });
});

/**
 * Helper function to get directory structure for snapshot testing
 */
async function getDirectoryStructure(dir: string): Promise<any> {
  const entries = await readdir(dir, { withFileTypes: true });
  const result: Record<string, any> = {};

  for (const entry of entries) {
    const name = entry.name;

    // Skip temporary files
    if (name.startsWith(".") || name === "node_modules") {
      continue;
    }

    const path = join(dir, name);

    if (entry.isDirectory()) {
      result[name] = await getDirectoryStructure(path);
    } else if (entry.isFile()) {
      // For files, include their content for snapshot testing
      if (name.endsWith(".json")) {
        try {
          const content = await readFile(path, "utf-8");
          result[name] = JSON.parse(content);
        } catch (e) {
          result[name] = "Failed to read file";
        }
      } else {
        result[name] = "file";
      }
    }
  }

  return result;
}
