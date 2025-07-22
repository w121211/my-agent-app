#!/usr/bin/env tsx

// examples/tool-call-demo.ts

import { Logger, type ILogObj } from "tslog";
import { createServerEventBus } from "../src/event-bus.js";
import { ToolRegistry } from "../src/services/tool-call/tool-registry.js";
import { ToolCallScheduler } from "../src/services/tool-call/tool-call-scheduler.js";
import {
  ApprovalMode,
  type ToolCallRequestInfo,
  type MCPServerConfig,
  type Tool,
} from "../src/services/tool-call/types.js";

async function createMockFileTool(): Promise<Tool> {
  return {
    name: "write_file",
    description: "Write content to a file",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        content: { type: "string" },
      },
      required: ["path", "content"],
    },

    async shouldConfirmExecute(args) {
      // Require confirmation for file writes
      return {
        message: `Write to file: ${args.path}`,
        dangerLevel: "medium" as const,
        affectedResources: [args.path as string],
        previewChanges: `Content:\n${args.content}`,
        onConfirm: async (outcome) => {
          console.log(`🔧 File write ${outcome}: ${args.path}`);
        },
      };
    },

    async execute(args, options) {
      console.log(`📝 Writing to file: ${args.path}`);

      // Simulate streaming output
      if (options.onOutput) {
        options.onOutput("Starting file write...\n");
        await new Promise((resolve) => setTimeout(resolve, 100));
        options.onOutput("Writing content...\n");
        await new Promise((resolve) => setTimeout(resolve, 100));
        options.onOutput("Write completed successfully!\n");
      }

      return {
        success: true,
        path: args.path,
        bytes_written: (args.content as string).length,
      };
    },

    getMetadata() {
      return {
        name: "write_file",
        description: "Write content to a file",
        category: "file",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string" },
            content: { type: "string" },
          },
          required: ["path", "content"],
        },
      };
    },
  };
}

async function createMockCalculatorTool(): Promise<Tool> {
  return {
    name: "calculator",
    description: "Perform mathematical calculations",
    inputSchema: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          enum: ["add", "subtract", "multiply", "divide"],
        },
        a: { type: "number" },
        b: { type: "number" },
      },
      required: ["operation", "a", "b"],
    },

    async shouldConfirmExecute() {
      // Auto-approve calculator operations (low risk)
      return null;
    },

    async execute(args) {
      const { operation, a, b } = args;
      let result: number;

      switch (operation) {
        case "add":
          result = (a as number) + (b as number);
          break;
        case "subtract":
          result = (a as number) - (b as number);
          break;
        case "multiply":
          result = (a as number) * (b as number);
          break;
        case "divide":
          if (b === 0) throw new Error("Division by zero");
          result = (a as number) / (b as number);
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      return {
        operation,
        operands: [a, b],
        result,
      };
    },

    getMetadata() {
      return {
        name: "calculator",
        description: "Perform mathematical calculations",
        category: "math",
        inputSchema: {
          type: "object",
          properties: {
            operation: {
              type: "string",
              enum: ["add", "subtract", "multiply", "divide"],
            },
            a: { type: "number" },
            b: { type: "number" },
          },
          required: ["operation", "a", "b"],
        },
      };
    },
  };
}

async function demonstrateToolCalls() {
  console.log("🚀 Starting Tool Call Demo\n");

  // Setup logger and event bus
  const logger = new Logger<ILogObj>({ name: "ToolCallDemo" });
  const eventBus = createServerEventBus({ logger });

  // Create tool registry
  const toolRegistry = new ToolRegistry(eventBus, logger);

  // Register built-in tools
  const fileTool = await createMockFileTool();
  const calcTool = await createMockCalculatorTool();

  toolRegistry.registerTool(fileTool);
  toolRegistry.registerTool(calcTool);

  // Register a mock MCP server
  const mcpServerConfig: MCPServerConfig = {
    name: "mock-server",
    url: "http://localhost:3001",
    enabled: true,
    category: "external",
  };

  try {
    await toolRegistry.registerMCPServer(mcpServerConfig);
    console.log("✅ MCP server registered successfully\n");
  } catch (error) {
    console.log(
      `⚠️ MCP server registration failed (expected in demo): ${error}\n`,
    );
  }

  // Create tool call scheduler
  const toolCallScheduler = new ToolCallScheduler({
    toolRegistry: Promise.resolve(toolRegistry),
    eventBus,
    logger,
    approvalMode: ApprovalMode.DEFAULT,
    outputUpdateHandler: (toolCallId: string, chunk: string) => {
      console.log(`📡 Tool ${toolCallId} output: ${chunk.trim()}`);
    },
    onAllToolCallsComplete: (completedCalls: any[]) => {
      console.log(`🎉 All ${completedCalls.length} tool calls completed!`);
    },
    onToolCallsUpdate: (toolCalls: any[]) => {
      console.log(`📊 Tool calls updated: ${toolCalls.length} calls`);
    },
  });

  // Demo 1: Simple calculator call (auto-approved)
  console.log("📋 Demo 1: Auto-approved Calculator Tool");
  const calcRequest: ToolCallRequestInfo = {
    callId: "calc-001",
    name: "calculator",
    args: {
      operation: "multiply",
      a: 12,
      b: 8,
    },
  };

  const completedCalcCalls = await toolCallScheduler.execute(
    calcRequest,
    "msg-001",
    {
      chatId: "chat-demo",
      messageId: "msg-001",
      projectPath: "/demo/project",
    },
  );

  console.log("✨ Calculator result:", completedCalcCalls[0]?.response?.result);
  console.log("📊 Calculator call status:", completedCalcCalls[0]?.status);
  if (completedCalcCalls[0]?.response?.error) {
    console.log("❌ Calculator error:", completedCalcCalls[0].response.error);
  }
  console.log("");

  // Demo 2: File write that requires confirmation
  console.log("📋 Demo 2: File Write Tool (requires confirmation)");
  const fileRequest: ToolCallRequestInfo = {
    callId: "file-001",
    name: "write_file",
    args: {
      path: "/tmp/demo.txt",
      content: "Hello from tool call demo!",
    },
  };

  // Start file write (will be pending approval)
  const fileExecutionPromise = toolCallScheduler.execute(
    fileRequest,
    "msg-002",
    {
      chatId: "chat-demo",
      messageId: "msg-002",
      projectPath: "/demo/project",
    },
  );

  // Simulate user approval after a delay
  setTimeout(async () => {
    try {
      const pendingApprovals = toolCallScheduler.getPendingApprovals();
      if (pendingApprovals.length > 0) {
        const waitingCall = pendingApprovals[0];
        console.log(
          `🤔 Pending approval: ${waitingCall.confirmationDetails.message}`,
        );
        console.log(
          `⚡ Danger level: ${waitingCall.confirmationDetails.dangerLevel}`,
        );
        console.log(
          `📁 Affected resources: ${waitingCall.confirmationDetails.affectedResources.join(", ")}`,
        );
        console.log("👍 Auto-approving in demo...");

        // Approve the tool call
        await waitingCall.confirmationDetails.onConfirm("approved");
      } else {
        console.log("📝 No pending approvals - file write was already processed");
      }
    } catch (error) {
      console.log("⚠️ Approval handling completed or no longer needed");
    }
  }, 1000);

  const completedFileCalls = await fileExecutionPromise;
  console.log("✨ File write result:", completedFileCalls[0]?.response?.result);
  console.log("");

  // Demo 3: Batch tool calls
  console.log("📋 Demo 3: Batch Tool Calls");
  const batchRequests: ToolCallRequestInfo[] = [
    {
      callId: "batch-001",
      name: "calculator",
      args: { operation: "add", a: 10, b: 5 },
    },
    {
      callId: "batch-002",
      name: "calculator",
      args: { operation: "subtract", a: 20, b: 8 },
    },
    {
      callId: "batch-003",
      name: "file_read", // This is from MCP server
      args: { path: "/demo/readme.txt" },
    },
  ];

  const completedBatchCalls = await toolCallScheduler.execute(
    batchRequests,
    "msg-003",
    {
      chatId: "chat-demo",
      messageId: "msg-003",
      projectPath: "/demo/project",
    },
  );

  console.log("✨ Batch results:");
  completedBatchCalls.forEach((call, index) => {
    console.log(
      `  ${index + 1}. ${call.request.name}: ${JSON.stringify(call.response?.result)}`,
    );
  });
  console.log("");

  // Demo 4: Tool registry health check
  console.log("📋 Demo 4: Tool Registry Health Check");
  const healthReport = await toolRegistry.checkToolHealth();
  console.log("🏥 Health Report:");
  console.log(`  Total tools: ${healthReport.totalTools}`);
  console.log(`  Healthy tools: ${healthReport.healthyTools}`);
  console.log(`  Unhealthy tools: ${healthReport.unhealthyTools}`);
  console.log(
    `  MCP servers: ${healthReport.mcpServers.total} (${healthReport.mcpServers.healthy} healthy)`,
  );
  console.log("");

  // Demo 5: List available tools
  console.log("📋 Demo 5: Available Tools");
  const allTools = toolRegistry.getAllTools();
  console.log("🔧 Registered tools:");
  allTools.forEach((tool) => {
    const metadata = tool.getMetadata();
    console.log(
      `  - ${metadata.name}: ${metadata.description} (category: ${metadata.category})`,
    );
  });

  console.log("\n🎊 Tool Call Demo completed successfully!");
}

// Run the demo (ESM compatible check)
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateToolCalls().catch((error) => {
    console.error("❌ Demo failed:", error);
    process.exit(1);
  });
}

export { demonstrateToolCalls };
