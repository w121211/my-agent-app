// packages/events-core/src/services/tool-call/tool-registry.ts

import { experimental_createMCPClient as createMCPClient } from "ai";
import type { Tool, ToolSet } from "ai";
import { Logger, type ILogObj } from "tslog";
import { wrapToolWithConfirmation } from "./tool-call-confirmation.js";
import type { IEventBus } from "../../event-bus.js";

// MCPClient type is not exported directly, so we infer them from the createMCPClient factory function.
type MCPClient = Awaited<ReturnType<typeof createMCPClient>>;

export interface MCPServerConfig {
  name: string;
  url: string;
  enabled: boolean;
  // category?: string;
  // TODO: OAuth support, now just a placeholder
  oauth?: {
    enabled: boolean;
    clientId?: string;
    authUrl?: string;
    tokenUrl?: string;
    scopes?: string[];
  };
}

export interface ToolMetadata {
  name: string;
  description: string;
  category: string;
  inputSchema: unknown;
}

export interface ToolsHealthReport {
  totalTools: number;
  healthyTools: number;
  unhealthyTools: number;
  mcpServers: {
    total: number;
    healthy: number;
    unhealthy: number;
  };
  details: Map<
    string,
    { status: string; metadata?: ToolMetadata; error?: string }
  >;
}

export interface ToolRegistrationMetadata {
  // category: string;
  source: "built-in" | "mcp";
  mcpServerName?: string;
  registeredAt: Date;
  confirmationLogic?: (input: any) => Promise<boolean>;
}

export interface ToolRegistry {
  registerTool(
    toolName: string,
    tool: Tool,
    metadata?: Partial<ToolRegistrationMetadata>,
  ): void;
  registerMCPServer(serverConfig: MCPServerConfig): Promise<void>;
  getToolSet(toolNames?: string[], mcpServerNames?: string[]): ToolSet;
  getToolSetByNames(toolNames: string[]): ToolSet;
  isBuiltInTool(name: string): boolean;
  isMCPTool(name: string): boolean;
  getTool(name: string): Tool | undefined;
  getMCPTool(name: string): Tool | undefined;
  getAllTools(): Map<string, Tool>;
  getToolMetadata(name: string): ToolRegistrationMetadata | undefined;
  checkToolsHealth(): ToolsHealthReport;
  // getToolsByCategory(category: string): Tool[];
}

export class ToolRegistryImpl implements ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private toolMetadata: Map<string, ToolRegistrationMetadata> = new Map();
  private mcpClients: Map<string, MCPClient> = new Map();
  private mcpToolSets: Map<string, ToolSet> = new Map();

  constructor(
    private eventBus: IEventBus,
    private logger: Logger<ILogObj>,
  ) {}

  registerTool(
    toolName: string,
    tool: Tool,
    metadata?: Partial<ToolRegistrationMetadata>,
  ): void {
    // Wrap tool with confirmation if confirmation logic is provided
    const wrappedTool = metadata?.confirmationLogic
      ? wrapToolWithConfirmation(toolName, tool, metadata.confirmationLogic)
      : tool;

    this.tools.set(toolName, wrappedTool);
    this.toolMetadata.set(toolName, {
      // category: metadata?.category || "built-in",
      source: "built-in",
      registeredAt: new Date(),
      ...metadata,
    });

    this.logger.info("Tool registered", {
      toolName,
      hasConfirmation: !!metadata?.confirmationLogic,
      // category: metadata?.category,
    });

    this.eventBus.emit({
      kind: "TOOL_REGISTERED",
      toolName,
      toolType: "built-in",
      timestamp: new Date(),
    });
  }

  async registerMCPServer(serverConfig: MCPServerConfig): Promise<void> {
    this.logger.info("Registering MCP server with AI SDK", {
      serverName: serverConfig.name,
    });

    const mcpClient = await createMCPClient({
      transport: {
        type: "sse",
        url: serverConfig.url,
        headers: serverConfig.oauth?.enabled
          ? {
              Authorization: `Bearer ${await this.getOAuthToken(serverConfig)}`,
            }
          : undefined,
      },
    });

    // MCP tools are already AI SDK compatible
    const mcpTools = await mcpClient.tools();

    // Store the entire ToolSet for this MCP server
    this.mcpToolSets.set(serverConfig.name, mcpTools);

    // Register metadata for each tool
    Object.keys(mcpTools).forEach((toolName) => {
      this.toolMetadata.set(toolName, {
        // category: serverConfig.category || "mcp",
        source: "mcp",
        mcpServerName: serverConfig.name,
        registeredAt: new Date(),
      });
    });

    this.mcpClients.set(serverConfig.name, mcpClient);

    this.logger.info("MCP server registered", {
      serverName: serverConfig.name,
      toolCount: Object.keys(mcpTools).length,
    });

    this.eventBus.emit({
      kind: "MCP_SERVER_REGISTERED",
      serverName: serverConfig.name,
      toolCount: Object.keys(mcpTools).length,
      timestamp: new Date(),
    });
  }

  getToolSet(toolNames?: string[], mcpServerNames?: string[]): ToolSet {
    const toolSet: ToolSet = {};

    // Add registered tools by tool names
    const selectedToolNames = toolNames ?? Array.from(this.tools.keys());
    selectedToolNames.forEach((name) => {
      const tool = this.tools.get(name);
      if (tool) {
        toolSet[name] = tool; // Return the full tool including execute method
      } else {
        throw new Error(`Tool "${name}" not found in registered tools.`);
      }
    });

    // Add MCP tools by server names
    const selectedServerNames =
      mcpServerNames ?? Array.from(this.mcpToolSets.keys());
    selectedServerNames.forEach((serverName) => {
      const mcpTools = this.mcpToolSets.get(serverName);
      if (mcpTools) {
        Object.assign(toolSet, mcpTools);
      } else {
        throw new Error(`MCP server "${serverName}" not found.`);
      }
    });

    return toolSet;
  }

  getToolSetByNames(toolNames: string[]): ToolSet {
    const toolSet: ToolSet = {};

    toolNames.forEach((name) => {
      // Check built-in tools first
      const tool = this.tools.get(name);
      if (tool) {
        toolSet[name] = tool;
        return;
      }

      // Check MCP tools
      const mcpTool = this.getMCPTool(name);
      if (mcpTool) {
        toolSet[name] = mcpTool;
        return;
      }

      throw new Error(
        `Tool "${name}" not found in registered tools or MCP servers.`,
      );
    });

    return toolSet;
  }

  isBuiltInTool(name: string): boolean {
    return this.tools.has(name);
  }

  isMCPTool(name: string): boolean {
    for (const mcpTools of Array.from(this.mcpToolSets.values())) {
      if (mcpTools[name]) {
        return true;
      }
    }
    return false;
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getMCPTool(name: string): Tool | undefined {
    for (const mcpTools of Array.from(this.mcpToolSets.values())) {
      if (mcpTools[name]) {
        return mcpTools[name];
      }
    }
    return undefined;
  }

  getAllTools(): Map<string, Tool> {
    return new Map(this.tools);
  }

  // getToolsByCategory(category: string): string[] {
  //   return Array.from(this.toolMetadata.entries())
  //     .filter(([, metadata]) => metadata.category === category)
  //     .map(([name]) => name);
  // }

  getToolMetadata(name: string): ToolRegistrationMetadata | undefined {
    return this.toolMetadata.get(name);
  }

  checkToolsHealth(): ToolsHealthReport {
    throw new Error("checkToolsHealth is not implemented yet");
  }

  private async getOAuthToken(serverConfig: MCPServerConfig): Promise<string> {
    throw new Error("OAuth support is not implemented yet");
  }
}
