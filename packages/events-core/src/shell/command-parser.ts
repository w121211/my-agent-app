import { ILogObj, Logger } from "tslog";
import {
  ClientEventType,
  ClientCreateTaskCommand,
  ClientStartTaskCommand,
  ClientStartSubtaskCommand,
  ClientCompleteSubtaskCommand,
  ClientStartNewChatCommand,
  ClientSubmitInitialPromptCommand,
  ClientSubmitMessageCommand,
  ClientApproveWork,
  ClientTestEvent,
  ChatMetadata,
} from "../event-types.js";

// Interface for typed command results
export interface ParsedCommand<T> {
  success: boolean;
  command?: T;
  error?: string;
}

/**
 * Parser utility for shell commands
 * Provides type-safe command creation
 */
export class CommandParser {
  private readonly logger: Logger<ILogObj>;

  constructor(logger: Logger<ILogObj>) {
    this.logger = logger;
  }

  /**
   * Parse create-task command arguments
   */
  public parseCreateTask(
    args: string[]
  ): ParsedCommand<ClientCreateTaskCommand> {
    if (args.length < 1) {
      return {
        success: false,
        error: "Task name is required",
      };
    }

    const taskName = args[0];
    let taskConfig: Record<string, unknown> = {};

    if (args.length > 1) {
      try {
        taskConfig = JSON.parse(args.slice(1).join(" "));
      } catch (error) {
        return {
          success: false,
          error: "Invalid task config JSON",
        };
      }
    }

    return {
      success: true,
      command: {
        eventType: "CLIENT_CREATE_TASK_COMMAND",
        taskName,
        taskConfig,
        timestamp: new Date(),
      },
    };
  }

  /**
   * Parse start-task command arguments
   */
  public parseStartTask(args: string[]): ParsedCommand<ClientStartTaskCommand> {
    if (args.length < 1) {
      return {
        success: false,
        error: "Task ID is required",
      };
    }

    return {
      success: true,
      command: {
        eventType: ClientEventType.CLIENT_START_TASK_COMMAND,
        taskId: args[0],
        timestamp: new Date(),
      },
    };
  }

  /**
   * Parse start-subtask command arguments
   */
  public parseStartSubtask(
    args: string[]
  ): ParsedCommand<ClientStartSubtaskCommand> {
    if (args.length < 2) {
      return {
        success: false,
        error: "Task ID and subtask ID are required",
      };
    }

    const [taskId, subtaskId] = args;

    return {
      success: true,
      command: {
        eventType: ClientEventType.CLIENT_START_SUBTASK_COMMAND,
        taskId,
        subtaskId,
        timestamp: new Date(),
      },
    };
  }

  /**
   * Parse complete-subtask command arguments
   */
  public parseCompleteSubtask(
    args: string[]
  ): ParsedCommand<ClientCompleteSubtaskCommand> {
    if (args.length < 3) {
      return {
        success: false,
        error: "Task ID, subtask ID, and output are required",
      };
    }

    const [taskId, subtaskId, output] = args;
    const requiresApproval =
      args.length > 3 ? args[3] === "true" || args[3] === "1" : false;

    return {
      success: true,
      command: {
        eventType: ClientEventType.CLIENT_COMPLETE_SUBTASK_COMMAND,
        taskId,
        subtaskId,
        output,
        requiresApproval,
        timestamp: new Date(),
      },
    };
  }

  /**
   * Parse start-chat command arguments
   */
  public parseStartChat(
    args: string[]
  ): ParsedCommand<ClientStartNewChatCommand> {
    if (args.length < 2) {
      return {
        success: false,
        error: "Task ID and subtask ID are required",
      };
    }

    const [taskId, subtaskId] = args;
    let metadata: ChatMetadata | undefined;

    if (args.length > 2) {
      try {
        metadata = JSON.parse(args.slice(2).join(" "));
      } catch (error) {
        return {
          success: false,
          error: "Invalid metadata JSON",
        };
      }
    }

    return {
      success: true,
      command: {
        eventType: ClientEventType.CLIENT_START_NEW_CHAT_COMMAND,
        taskId,
        subtaskId,
        metadata,
        timestamp: new Date(),
      },
    };
  }

  /**
   * Parse submit-message command arguments
   */
  public parseSubmitMessage(
    args: string[]
  ): ParsedCommand<ClientSubmitMessageCommand> {
    if (args.length < 2) {
      return {
        success: false,
        error: "Chat ID and message are required",
      };
    }

    const chatId = args[0];
    const content = args.slice(1).join(" ");

    return {
      success: true,
      command: {
        eventType: ClientEventType.CLIENT_SUBMIT_MESSAGE_COMMAND,
        chatId,
        content,
        timestamp: new Date(),
      },
    };
  }

  /**
   * Parse submit-prompt command arguments
   */
  public parseSubmitPrompt(
    args: string[]
  ): ParsedCommand<ClientSubmitInitialPromptCommand> {
    if (args.length < 2) {
      return {
        success: false,
        error: "Chat ID and prompt are required",
      };
    }

    const chatId = args[0];
    const prompt = args.slice(1).join(" ");

    return {
      success: true,
      command: {
        eventType: ClientEventType.CLIENT_SUBMIT_INITIAL_PROMPT_COMMAND,
        chatId,
        prompt,
        timestamp: new Date(),
      },
    };
  }

  /**
   * Parse approve-work command arguments
   */
  public parseApproveWork(args: string[]): ParsedCommand<ClientApproveWork> {
    if (args.length < 1) {
      return {
        success: false,
        error: "Chat ID is required",
      };
    }

    const chatId = args[0];
    const approvedWork = args.length > 1 ? args.slice(1).join(" ") : undefined;

    return {
      success: true,
      command: {
        eventType: ClientEventType.CLIENT_APPROVE_WORK,
        chatId,
        approvedWork,
        timestamp: new Date(),
      },
    };
  }

  /**
   * Parse test-event command arguments
   */
  public parseTestEvent(args: string[]): ParsedCommand<ClientTestEvent> {
    if (args.length < 1) {
      return {
        success: false,
        error: "Message is required",
      };
    }

    const message = args.join(" ");

    return {
      success: true,
      command: {
        eventType: ClientEventType.CLIENT_TEST_EVENT,
        message,
        timestamp: new Date(),
      },
    };
  }

  /**
   * Parse command string into arguments
   * Handles quoted strings and escaping
   */
  public parseCommandString(input: string): string[] {
    const args: string[] = [];
    let current = "";
    let inQuotes = false;
    let escapeNext = false;

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

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
}
