// packages/events-core/src/services/tool-call/tool-registry.ts

import { Logger, type ILogObj } from "tslog";
import type { IEventBus } from "../../event-bus.js";
import type {
  Tool,
  ToolRegistry as IToolRegistry,
  ToolMetadata,
  ToolHealthReport,
  MCPServerConfig,
  MCPClient,
  MCPToolInfo,
  ToolCallConfirmationDetails,
  ToolConfirmationOutcome,
} from "./types.js";

export class ToolRegistry implements IToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private mcpClients: Map<string, MCPClient> = new Map();
  private toolCategories: Map<string, string[]> = new Map();
  private logger: Logger<ILogObj>;
  private eventBus: IEventBus;

  constructor(eventBus: IEventBus, logger: Logger<ILogObj>) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  registerTool(tool: Tool): void {
    this.logger.info("Registering built-in tool", { name: tool.name });
    this.tools.set(tool.name, tool);

    this.eventBus.emit({
      kind: "TOOL_REGISTERED",
      toolName: tool.name,
      toolType: "built-in",
      timestamp: new Date(),
    });
  }

  async registerMCPServer(serverConfig: MCPServerConfig): Promise<void> {
    this.logger.info("Registering MCP server", {
      serverName: serverConfig.name,
    });

    try {
      // Create a mock MCP client for this implementation
      const mcpClient = await this.createMockMCPClient(serverConfig);

      // Handle OAuth authentication (if needed)
      if (serverConfig.oauth?.enabled) {
        await this.handleMCPOAuth(mcpClient, serverConfig);
      }

      // Get available tools list
      const toolsInfo = await mcpClient.listTools();
      const resourcesInfo = await mcpClient.listResources();
      const promptsInfo = await mcpClient.listPrompts();

      // Create wrapper for each MCP tool
      for (const toolInfo of toolsInfo) {
        const mcpTool = this.createMCPToolWrapper(
          toolInfo,
          mcpClient,
          serverConfig,
        );
        this.tools.set(toolInfo.name, mcpTool);

        // Category management
        const category = serverConfig.category || "mcp";
        if (!this.toolCategories.has(category)) {
          this.toolCategories.set(category, []);
        }
        this.toolCategories.get(category)!.push(toolInfo.name);
      }

      this.mcpClients.set(serverConfig.name, mcpClient);

      this.logger.info("MCP server registered successfully", {
        serverName: serverConfig.name,
        toolCount: toolsInfo.length,
        resourceCount: resourcesInfo.length,
        promptCount: promptsInfo.length,
      });

      this.eventBus.emit({
        kind: "MCP_SERVER_REGISTERED",
        serverName: serverConfig.name,
        toolCount: toolsInfo.length,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error("Failed to register MCP server", error);
      throw new Error(
        `Failed to register MCP server ${serverConfig.name}: ${error}`,
      );
    }
  }

  private async createMockMCPClient(
    serverConfig: MCPServerConfig,
  ): Promise<MCPClient> {
    // Mock MCP client implementation for demo purposes
    return {
      async listTools(): Promise<MCPToolInfo[]> {
        return [
          {
            name: "file_read",
            description: "Read file content",
            inputSchema: {
              type: "object",
              properties: {
                path: { type: "string" },
              },
              required: ["path"],
            },
          },
          {
            name: "file_write",
            description: "Write file content",
            inputSchema: {
              type: "object",
              properties: {
                path: { type: "string" },
                content: { type: "string" },
              },
              required: ["path", "content"],
            },
          },
        ];
      },

      async listResources(): Promise<unknown[]> {
        return [];
      },

      async listPrompts(): Promise<unknown[]> {
        return [];
      },

      async callTool(
        name: string,
        args: Record<string, unknown>,
        options?: {
          signal?: AbortSignal;
          onProgress?: (chunk: string) => void;
        },
      ): Promise<unknown> {
        // Mock tool execution
        if (name === "file_read") {
          return `Mock content for file: ${args.path}`;
        } else if (name === "file_write") {
          return `Successfully wrote to file: ${args.path}`;
        }
        return `Mock result for tool ${name}`;
      },

      async authenticate(token: string): Promise<void> {
        // Mock authentication
        return;
      },

      async ping(): Promise<void> {
        return;
      },
    };
  }

  private async handleMCPOAuth(
    client: MCPClient,
    serverConfig: MCPServerConfig,
  ): Promise<void> {
    const oauthConfig = serverConfig.oauth!;

    // Mock OAuth flow for demo
    this.logger.info("Starting OAuth flow for MCP server", {
      serverName: serverConfig.name,
    });

    // Use mock token for authentication
    await client.authenticate("mock-oauth-token");
  }

  private createMCPToolWrapper(
    toolInfo: MCPToolInfo,
    client: MCPClient,
    serverConfig: MCPServerConfig,
  ): Tool {
    return {
      name: toolInfo.name,
      description: toolInfo.description || `MCP tool from ${serverConfig.name}`,
      inputSchema: toolInfo.inputSchema,

      async shouldConfirmExecute(
        args: Record<string, unknown>,
      ): Promise<ToolCallConfirmationDetails | null> {
        // MCP tool risk assessment logic
        const dangerLevel = this.assessMCPToolDanger(
          toolInfo,
          args,
          serverConfig,
        );

        if (dangerLevel === "low") {
          return null; // Auto-approve low risk operations
        }

        return {
          message: `Execute ${toolInfo.name} from ${serverConfig.name}`,
          dangerLevel,
          affectedResources: this.extractAffectedResources(args),
          onConfirm: async (outcome) => {
            this.logger.info("MCP tool confirmation", {
              toolName: toolInfo.name,
              serverName: serverConfig.name,
              outcome,
            });
          },
        };
      },

      async execute(args, options) {
        const startTime = Date.now();

        try {
          this.logger.info("Executing MCP tool", {
            toolName: toolInfo.name,
            serverName: serverConfig.name,
          });

          // Call MCP tool
          const result = await client.callTool(toolInfo.name, args, {
            signal: options.signal,
            onProgress: options.onOutput,
          });

          const duration = Date.now() - startTime;
          this.logger.info("MCP tool executed successfully", {
            toolName: toolInfo.name,
            duration,
          });

          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          this.logger.error("MCP tool execution failed", {
            toolName: toolInfo.name,
            duration,
            error,
          });
          throw error;
        }
      },

      getMetadata(): ToolMetadata {
        return {
          name: toolInfo.name,
          description: toolInfo.description || "",
          category: serverConfig.category || "mcp",
          inputSchema: toolInfo.inputSchema,
        };
      },
    };
  }

  private assessMCPToolDanger(
    toolInfo: MCPToolInfo,
    args: Record<string, unknown>,
    serverConfig: MCPServerConfig,
  ): "low" | "medium" | "high" {
    // Simple risk assessment based on tool name and args
    const toolName = toolInfo.name.toLowerCase();

    if (
      toolName.includes("read") ||
      toolName.includes("get") ||
      toolName.includes("list")
    ) {
      return "low";
    }

    if (
      toolName.includes("write") ||
      toolName.includes("create") ||
      toolName.includes("update")
    ) {
      return "medium";
    }

    if (
      toolName.includes("delete") ||
      toolName.includes("remove") ||
      toolName.includes("execute")
    ) {
      return "high";
    }

    return "medium";
  }

  private extractAffectedResources(args: Record<string, unknown>): string[] {
    const resources: string[] = [];

    // Extract file paths from common argument names
    const pathFields = [
      "path",
      "file",
      "filepath",
      "filename",
      "target",
      "source",
    ];

    for (const field of pathFields) {
      if (args[field] && typeof args[field] === "string") {
        resources.push(args[field] as string);
      }
    }

    return resources;
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getToolsByCategory(category: string): Tool[] {
    const toolNames = this.toolCategories.get(category) || [];
    return toolNames.map((name) => this.tools.get(name)!).filter(Boolean);
  }

  async checkToolHealth(): Promise<ToolHealthReport> {
    const report: ToolHealthReport = {
      totalTools: this.tools.size,
      healthyTools: 0,
      unhealthyTools: 0,
      mcpServers: {
        total: this.mcpClients.size,
        healthy: 0,
        unhealthy: 0,
      },
      details: new Map(),
    };

    // Check built-in tools
    for (const [name, tool] of this.tools.entries()) {
      try {
        // Try basic tool metadata check
        const metadata = tool.getMetadata();
        report.healthyTools++;
        report.details.set(name, { status: "healthy", metadata });
      } catch (error) {
        report.unhealthyTools++;
        report.details.set(name, { status: "unhealthy", error: String(error) });
      }
    }

    // Check MCP server health status
    for (const [serverName, client] of this.mcpClients.entries()) {
      try {
        await client.ping();
        report.mcpServers.healthy++;
      } catch (error) {
        report.mcpServers.unhealthy++;
        this.logger.warn("MCP server health check failed", {
          serverName,
          error,
        });
      }
    }

    return report;
  }
}
