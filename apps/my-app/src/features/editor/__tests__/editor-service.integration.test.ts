import "reflect-metadata";
import { ILogObj, Logger } from "tslog";
import { EditorService } from "../editor-service";
import {
  useEditorStore,
  mockData,
  ItemType,
  FolderItem,
} from "../editor-store";

// Simple EventBus implementation for testing
class TestEventBus {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  private handlers: Record<string, Function[]> = {};

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  subscribe(eventType: string, handler: Function): void {
    if (!this.handlers[eventType]) {
      this.handlers[eventType] = [];
    }
    this.handlers[eventType].push(handler);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit(event: any): void {
    const handlers = this.handlers[event.eventType] || [];
    handlers.forEach((handler) => handler(event));
  }
}

describe("EditorService Integration Tests", () => {
  let editorService: EditorService;
  let eventBus: TestEventBus;
  let logger: Logger<ILogObj>;

  beforeEach(() => {
    // Reset the store to initial state before each test
    useEditorStore.setState({
      data: JSON.parse(JSON.stringify(mockData)), // Deep clone to prevent mutations between tests
      selectedItem: null,
      expandedFolders: new Set(["root"]),
    });

    // Set up the dependencies
    logger = new Logger({ name: "TestLogger" });
    eventBus = new TestEventBus();

    // Initialize the service with real dependencies
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editorService = new EditorService(eventBus as any, logger);
  });

  // Helper function to find an item by ID in the store
  const findItemById = (id: string): ItemType | null => {
    const findRecursive = (
      item: ItemType,
      targetId: string
    ): ItemType | null => {
      if (item.id === targetId) return item;

      if ("children" in item && (item as FolderItem).children) {
        for (const child of (item as FolderItem).children!) {
          const found = findRecursive(child, targetId);
          if (found) return found;
        }
      }

      return null;
    };

    return findRecursive(useEditorStore.getState().data, id);
  };

  test("should create a new task when SERVER_TASK_CREATED event is emitted", () => {
    // Get initial task count
    const initialTaskCount =
      useEditorStore.getState().data.children?.length || 0;

    // Emit task created event
    eventBus.emit({
      eventType: "SERVER_TASK_CREATED",
      timestamp: new Date(),
      taskId: "test-task-1",
      taskName: "Test Task",
      config: {},
    });

    // Verify a new task was added
    const newTaskCount = useEditorStore.getState().data.children?.length || 0;
    expect(newTaskCount).toBe(initialTaskCount + 1);

    // Verify the new task is selected
    const selectedItem = useEditorStore.getState().selectedItem;
    expect(selectedItem).not.toBeNull();
    expect(selectedItem?.type).toBe("folder");
  });

  test("should select a task when SERVER_TASK_LOADED event is emitted", () => {
    // Assume t21 exists in the mock data
    const taskId = "t21";

    // Initially no item is selected
    expect(useEditorStore.getState().selectedItem).toBeNull();

    // Emit task loaded event
    eventBus.emit({
      eventType: "SERVER_TASK_LOADED",
      timestamp: new Date(),
      taskId,
      taskState: {
        id: taskId,
        seqNumber: 21,
        title: "Task 21",
        status: "IN_PROGRESS",
        subtasks: [],
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Verify the task is now selected
    const selectedItem = useEditorStore.getState().selectedItem;
    expect(selectedItem).not.toBeNull();
    expect(selectedItem?.id).toBe(taskId);
  });

  test("should select and expand a subtask folder when SERVER_SUBTASK_STARTED event is emitted", () => {
    const subtaskId = "s2"; // From mock data

    // Initially the subtask is not expanded
    expect(useEditorStore.getState().isExpanded(subtaskId)).toBe(false);

    // Emit subtask started event
    eventBus.emit({
      eventType: "SERVER_SUBTASK_STARTED",
      timestamp: new Date(),
      taskId: "t21",
      subtaskId,
    });

    // Verify the subtask is now selected and expanded
    expect(useEditorStore.getState().selectedItem?.id).toBe(subtaskId);
    expect(useEditorStore.getState().isExpanded(subtaskId)).toBe(true);
  });

  test("should create a new chat when SERVER_CHAT_CREATED event is emitted", () => {
    const subtaskId = "s1"; // From mock data
    const subtaskBefore = findItemById(subtaskId) as FolderItem;
    const initialChildCount = subtaskBefore?.children?.length || 0;

    // Emit chat created event
    eventBus.emit({
      eventType: "SERVER_CHAT_CREATED",
      timestamp: new Date(),
      taskId: "t21",
      subtaskId,
      chatId: "new-chat-1",
    });

    // Get updated subtask
    const subtaskAfter = findItemById(subtaskId) as FolderItem;
    const newChildCount = subtaskAfter?.children?.length || 0;

    // Verify a new chat was added
    expect(newChildCount).toBe(initialChildCount + 1);

    // Verify the new chat is selected
    const selectedItem = useEditorStore.getState().selectedItem;
    expect(selectedItem).not.toBeNull();
    expect(selectedItem?.type).toBe("chat");
  });

  test("should add a message to a chat when SERVER_MESSAGE_RECEIVED event is emitted", async () => {
    const chatId = "c01-s1"; // From mock data
    const chatBefore = findItemById(chatId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const initialMessageCount = (chatBefore as any).messages?.length || 0;

    // Emit message received event
    eventBus.emit({
      eventType: "SERVER_MESSAGE_RECEIVED",
      timestamp: new Date(),
      chatId,
      message: {
        id: "msg-1",
        role: "USER",
        content: "Test message",
        timestamp: new Date(),
      },
    });

    // Get updated chat
    const chatAfter = findItemById(chatId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newMessageCount = (chatAfter as any).messages?.length || 0;

    // Verify a new message was added
    expect(newMessageCount).toBe(initialMessageCount + 1);

    // Wait for the mock AI response (added after timeout in store)
    await new Promise((resolve) => setTimeout(resolve, 1200)); // Slightly longer than the 1000ms timeout

    // Get final state
    const chatFinal = findItemById(chatId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalMessageCount = (chatFinal as any).messages?.length || 0;

    // Verify an AI response was also added
    expect(finalMessageCount).toBe(initialMessageCount + 2); // User message + AI response

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastMessage = (chatFinal as any).messages[finalMessageCount - 1];
    expect(lastMessage.role).toBe("AI");
  });

  test("should emit CLIENT_CREATE_TASK_COMMAND when createTask method is called", () => {
    // Spy on the emit method
    const emitSpy = jest.spyOn(eventBus, "emit");

    // Call the service method
    editorService.clientCreateTask("New Task", { priority: "high" });

    // Verify the correct event was emitted
    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "CLIENT_CREATE_TASK_COMMAND",
        taskName: "New Task",
        taskConfig: { priority: "high" },
      })
    );
  });

  test("should emit CLIENT_SUBMIT_MESSAGE_COMMAND when submitMessage method is called", () => {
    // Spy on the emit method
    const emitSpy = jest.spyOn(eventBus, "emit");

    // Call the service method
    editorService.clientSubmitMessage("chat-123", "Hello world");

    // Verify the correct event was emitted
    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "CLIENT_SUBMIT_MESSAGE_COMMAND",
        chatId: "chat-123",
        content: "Hello world",
      })
    );
  });

  test("should emit CLIENT_START_NEW_CHAT_COMMAND with metadata when startNewChat is called", () => {
    const emitSpy = jest.spyOn(eventBus, "emit");

    const metadata = {
      title: "Planning Discussion",
      tags: ["planning", "discussion"],
    };

    editorService.clientStartNewChat("t21", "s1", metadata);

    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "CLIENT_START_NEW_CHAT_COMMAND",
        taskId: "t21",
        subtaskId: "s1",
        metadata,
      })
    );
  });
});
