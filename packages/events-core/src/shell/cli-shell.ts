import readline from "node:readline";
import { stdin as input, stdout as output } from "node:process";
import path from "node:path";
import { Logger } from "tslog";
import { createServerEventBus, IEventBus } from "../event-bus.js";
import { WorkspaceManager } from "../workspace-manager.js";
import { TaskRepository, ChatRepository } from "../repositories.js";
import { TaskService } from "../task-service.js";
import { SubtaskService } from "../subtask-service.js";
import { ChatService } from "../chat-service.js";
import { FileWatcher } from "../file-watcher.js";
import {
  ClientEventType,
  ServerEventType,
  ClientCreateTaskCommand,
  ClientStartTaskCommand,
  ClientStartSubtaskCommand,
  ClientCompleteSubtaskCommand,
  ClientStartNewChatCommand,
  ClientSubmitInitialPromptCommand,
  ClientSubmitMessageCommand,
  ClientApproveWork,
  ClientTestEvent,
  Task,
  Subtask,
  ChatMetadata,
} from "../event-types.js";

// Setup logger and constants
const logger = new Logger({ name: "CLI-Shell" });
const workspacePath =
  process.env.WORKSPACE_PATH || path.join(process.cwd(), "workspace");

// Command type definitions for strong typing
interface CommandDefinition {
  name: string;
  description: string;
  usage: string;
  execute: (args: string[]) => Promise<void>;
}

// Shell class to encapsulate all functionality
class CliShell {
  private readonly eventBus: IEventBus;
  private readonly workspaceManager: WorkspaceManager;
  private readonly taskRepo: TaskRepository;
  private readonly chatRepo: ChatRepository;
  private readonly fileWatcher: FileWatcher;
  private readonly rl: readline.Interface;
  private readonly commands: Map<string, CommandDefinition>;

  constructor() {
    // Initialize components
    this.eventBus = createServerEventBus({ logger });
    this.workspaceManager = new WorkspaceManager(workspacePath, logger);
    this.taskRepo = new TaskRepository(this.workspaceManager);
    this.chatRepo = new ChatRepository(this.workspaceManager);

    // Initialize services
    new TaskService(this.eventBus, this.taskRepo);
    new SubtaskService(this.eventBus, this.taskRepo);
    new ChatService(this.eventBus, this.chatRepo);

    // File watcher
    this.fileWatcher = new FileWatcher(this.eventBus, workspacePath);

    // Setup readline interface
    this.rl = readline.createInterface({ input, output });

    // Initialize commands
    this.commands = this.setupCommands();
  }

  private setupCommands(): Map<string, CommandDefinition> {
    const commands = new Map<string, CommandDefinition>();

    commands.set("create-task", {
      name: "create-task",
      description: "Create a new task",
      usage: "create-task <task-name> [config-json]",
      execute: async (args: string[]) => {
        if (args.length < 1) {
          throw new Error("Task name is required");
        }

        const taskName = args[0];
        let taskConfig: Record<string, unknown> = {};

        if (args.length > 1) {
          try {
            taskConfig = JSON.parse(args.slice(1).join(" "));
          } catch (error) {
            throw new Error("Invalid task config JSON");
          }
        }

        await this.eventBus.emit<ClientCreateTaskCommand>({
          eventType: ClientEventType.CLIENT_CREATE_TASK_COMMAND,
          taskName,
          taskConfig,
          timestamp: new Date(),
        });

        logger.info(`Created task: ${taskName}`);
      },
    });

    commands.set("start-task", {
      name: "start-task",
      description: "Start an existing task",
      usage: "start-task <task-id>",
      execute: async (args: string[]) => {
        if (args.length < 1) {
          throw new Error("Task ID is required");
        }

        const taskId = args[0];
        if (!taskId) {
          throw new Error("Task ID cannot be empty");
        }

        await this.eventBus.emit<ClientStartTaskCommand>({
          eventType: "CLIENT_START_TASK_COMMAND",
          taskId,
          timestamp: new Date(),
        });

        logger.info(`Started task: ${taskId}`);
      },
    });

    commands.set("start-subtask", {
      name: "start-subtask",
      description: "Start a subtask within a task",
      usage: "start-subtask <task-id> <subtask-id>",
      execute: async (args: string[]) => {
        if (args.length < 2) {
          throw new Error("Task ID and subtask ID are required");
        }

        const [taskId, subtaskId] = args;

        if (!taskId || !subtaskId) {
          throw new Error("Task ID and subtask ID cannot be empty");
        }

        await this.eventBus.emit<ClientStartSubtaskCommand>({
          eventType: "CLIENT_START_SUBTASK_COMMAND",
          taskId,
          subtaskId,
          timestamp: new Date(),
        });

        logger.info(`Started subtask: ${subtaskId} in task: ${taskId}`);
      },
    });

    commands.set("complete-subtask", {
      name: "complete-subtask",
      description: "Complete a subtask",
      usage:
        "complete-subtask <task-id> <subtask-id> <output> [requires-approval]",
      execute: async (args: string[]) => {
        if (args.length < 3) {
          throw new Error("Task ID, subtask ID, and output are required");
        }

        const [taskId, subtaskId, output] = args;
        const requiresApproval =
          args.length > 3 ? args[3] === "true" || args[3] === "1" : false;

        await this.eventBus.emit<ClientCompleteSubtaskCommand>({
          eventType: "CLIENT_COMPLETE_SUBTASK_COMMAND",
          taskId,
          subtaskId,
          output,
          requiresApproval,
          timestamp: new Date(),
        });

        logger.info(`Completed subtask: ${subtaskId} in task: ${taskId}`);
      },
    });

    commands.set("start-chat", {
      name: "start-chat",
      description: "Start a new chat for a subtask",
      usage: "start-chat <task-id> <subtask-id> [metadata-json]",
      execute: async (args: string[]) => {
        if (args.length < 2) {
          throw new Error("Task ID and subtask ID are required");
        }

        const [taskId, subtaskId] = args;
        let metadata: ChatMetadata | undefined;

        if (args.length > 2) {
          try {
            metadata = JSON.parse(args.slice(2).join(" "));
          } catch (error) {
            throw new Error("Invalid metadata JSON");
          }
        }

        await this.eventBus.emit<ClientStartNewChatCommand>({
          eventType: ClientEventType.CLIENT_START_NEW_CHAT_COMMAND,
          taskId,
          subtaskId,
          metadata,
          timestamp: new Date(),
        });

        logger.info(
          `Started new chat for subtask: ${subtaskId} in task: ${taskId}`
        );
      },
    });

    commands.set("submit-message", {
      name: "submit-message",
      description: "Submit a message to a chat",
      usage: "submit-message <chat-id> <message>",
      execute: async (args: string[]) => {
        if (args.length < 2) {
          throw new Error("Chat ID and message are required");
        }

        const chatId = args[0];
        const content = args.slice(1).join(" ");

        await this.eventBus.emit<ClientSubmitMessageCommand>({
          eventType: ClientEventType.CLIENT_SUBMIT_MESSAGE_COMMAND,
          chatId,
          content,
          timestamp: new Date(),
        });

        logger.info(`Submitted message to chat: ${chatId}`);
      },
    });

    commands.set("submit-prompt", {
      name: "submit-prompt",
      description: "Submit an initial prompt to a chat",
      usage: "submit-prompt <chat-id> <prompt>",
      execute: async (args: string[]) => {
        if (args.length < 2) {
          throw new Error("Chat ID and prompt are required");
        }

        const chatId = args[0];
        const prompt = args.slice(1).join(" ");

        await this.eventBus.emit<ClientSubmitInitialPromptCommand>({
          eventType: ClientEventType.CLIENT_SUBMIT_INITIAL_PROMPT_COMMAND,
          chatId,
          prompt,
          timestamp: new Date(),
        });

        logger.info(`Submitted initial prompt to chat: ${chatId}`);
      },
    });

    commands.set("approve-work", {
      name: "approve-work",
      description: "Approve work in a chat",
      usage: "approve-work <chat-id> [approved-work]",
      execute: async (args: string[]) => {
        if (args.length < 1) {
          throw new Error("Chat ID is required");
        }

        const chatId = args[0];
        const approvedWork =
          args.length > 1 ? args.slice(1).join(" ") : undefined;

        await this.eventBus.emit<ClientApproveWork>({
          eventType: ClientEventType.CLIENT_APPROVE_WORK,
          chatId,
          approvedWork,
          timestamp: new Date(),
        });

        logger.info(`Approved work in chat: ${chatId}`);
      },
    });

    commands.set("list-tasks", {
      name: "list-tasks",
      description: "List all tasks",
      usage: "list-tasks",
      execute: async () => {
        const tasks = await this.taskRepo.findAll();

        if (tasks.length === 0) {
          logger.info("No tasks found");
          return;
        }

        const formatTask = (task: Task): string => {
          const lines = [
            `- ${task.id}: ${task.title} (${task.status})`,
            `  Created: ${task.createdAt.toISOString()}`,
            `  Updated: ${task.updatedAt.toISOString()}`,
            `  Subtasks: ${task.subtasks.length}`,
          ];

          task.subtasks.forEach((subtask: Subtask) => {
            lines.push(
              `  - ${subtask.id}: ${subtask.title} (${subtask.status})`
            );
          });

          return lines.join("\n");
        };

        const output = ["Tasks:"].concat(tasks.map(formatTask)).join("\n");
        logger.info(output);
      },
    });

    commands.set("test-event", {
      name: "test-event",
      description: "Send a test event to the event bus",
      usage: "test-event <message>",
      execute: async (args: string[]) => {
        if (args.length < 1) {
          throw new Error("Message is required");
        }

        const message = args.join(" ");

        await this.eventBus.emit<ClientTestEvent>({
          eventType: ClientEventType.CLIENT_TEST_EVENT,
          message,
          timestamp: new Date(),
        });

        logger.info(`Sent test event with message: ${message}`);
      },
    });

    commands.set("help", {
      name: "help",
      description: "Display help information",
      usage: "help [command]",
      execute: async (args: string[]) => {
        if (args.length > 0) {
          const commandName = args[0];
          const command = this.commands.get(commandName);

          if (!command) {
            throw new Error(`Unknown command: ${commandName}`);
          }

          logger.info(`Command: ${command.name}`);
          logger.info(`Description: ${command.description}`);
          logger.info(`Usage: ${command.usage}`);
          return;
        }

        logger.info("Available commands:");

        for (const command of this.commands.values()) {
          logger.info(`  ${command.name.padEnd(15)} - ${command.description}`);
        }

        logger.info(
          '\nType "help <command>" for more information on a specific command.'
        );
      },
    });

    commands.set("exit", {
      name: "exit",
      description: "Exit the CLI shell",
      usage: "exit",
      execute: async () => {
        logger.info("Exiting...");
        await this.shutdown();
        process.exit(0);
      },
    });

    return commands;
  }

  private parseCommandArgs(argsString: string): string[] {
    const args: string[] = [];
    let current = "";
    let inQuotes = false;
    let escapeNext = false;

    for (let i = 0; i < argsString.length; i++) {
      const char = argsString[i];

      if (escapeNext) {
        current += char;
        escapeNext = false;
        continue;
      }

      if (char === "\\") {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (char === " " && !inQuotes) {
        if (current) {
          args.push(current);
          current = "";
        }
        continue;
      }

      current += char;
    }

    if (current) {
      args.push(current);
    }

    return args;
  }

  private async executeCommand(input: string): Promise<void> {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    // Split the input into command and args
    const parts = trimmedInput.split(" ");
    const commandName = parts[0];
    const argsString = parts.slice(1).join(" ");

    // Get the command
    const command = this.commands.get(commandName);

    if (!command) {
      logger.error(`Unknown command: ${commandName}`);
      logger.info('Type "help" for available commands');
      return;
    }

    try {
      // Parse args and execute command
      const args = this.parseCommandArgs(argsString);
      await command.execute(args);
    } catch (error) {
      logger.error(error instanceof Error ? error.message : String(error));
    }
  }

  private setupEventListeners(): void {
    // Listen for task creation events
    this.eventBus.subscribe(ServerEventType.SERVER_TASK_CREATED, (event) => {
      logger.info(`[EVENT] Task created: ${event.taskId} (${event.taskName})`);
    });

    // Listen for task initialization events
    this.eventBus.subscribe(
      ServerEventType.SERVER_TASK_INITIALIZED,
      (event) => {
        logger.info(`[EVENT] Task initialized: ${event.taskId}`);
      }
    );

    // Listen for subtask started events
    this.eventBus.subscribe(ServerEventType.SERVER_SUBTASK_STARTED, (event) => {
      logger.info(
        `[EVENT] Subtask started: ${event.subtaskId} in task ${event.taskId}`
      );
    });

    // Listen for subtask completed events
    this.eventBus.subscribe(
      ServerEventType.SERVER_SUBTASK_COMPLETED,
      (event) => {
        logger.info(
          `[EVENT] Subtask completed: ${event.subtaskId} in task ${event.taskId}`
        );
      }
    );

    // Listen for chat creation events
    this.eventBus.subscribe(ServerEventType.SERVER_CHAT_CREATED, (event) => {
      logger.info(
        `[EVENT] Chat created: ${event.chatId} for subtask ${event.subtaskId}`
      );
    });

    // Listen for message received events
    this.eventBus.subscribe(
      ServerEventType.SERVER_MESSAGE_RECEIVED,
      (event) => {
        logger.info(`[EVENT] New message received in chat ${event.chatId}`);
      }
    );
  }

  private async initialize(): Promise<void> {
    logger.info("Initializing application...");

    // Create workspace directory if it doesn't exist
    await this.workspaceManager.ensureFolderExists(workspacePath);

    // Load existing tasks
    await this.taskRepo.loadWorkspace();

    // Start file watcher
    this.fileWatcher.startWatching();

    // Set up event listeners
    this.setupEventListeners();

    logger.info(`Application initialized. Workspace: ${workspacePath}`);
  }

  public async start(): Promise<void> {
    try {
      await this.initialize();

      logger.info('CLI Shell started. Type "help" for available commands.');

      this.rl.setPrompt("> ");
      this.rl.prompt();

      this.rl.on("line", async (line) => {
        await this.executeCommand(line);
        this.rl.prompt();
      });

      this.rl.on("close", async () => {
        logger.info("CLI Shell closed");
        await this.shutdown();
        process.exit(0);
      });
    } catch (error) {
      logger.error(
        `Failed to start CLI Shell: ${error instanceof Error ? error.message : String(error)}`
      );
      await this.shutdown();
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    logger.info("Shutting down...");
    await this.fileWatcher.stopWatching();
    this.rl.close();
  }
}

// Start the application
const shell = new CliShell();
shell.start().catch((error) => {
  logger.error(
    `Fatal error: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
});
