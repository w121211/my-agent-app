# Tool Call System

This directory contains the backend implementation for function call / MCP (Model Context Protocol) functionality based on the gemini-cli CoreToolScheduler architecture.

## Architecture Overview

### Core Components

1. **ToolCallScheduler** (`tool-call-scheduler.ts`) - Main orchestrator for tool execution
2. **ToolRegistry** (`tool-registry.ts`) - Manages built-in and MCP tools
3. **Types** (`types.ts`) - TypeScript interfaces and types

### Key Features

- ✅ **Full state machine** with 7 tool call states (validating, scheduled, executing, success, error, cancelled, awaiting_approval)
- ✅ **Permission system** with user confirmation dialogs for dangerous operations  
- ✅ **MCP integration** with OAuth support for external tool servers
- ✅ **Real-time streaming** output and progress updates
- ✅ **Event-driven architecture** integrated with the existing event bus
- ✅ **Batch execution** of multiple tool calls in parallel
- ✅ **Error handling** and graceful failure recovery
- ✅ **Health monitoring** for tool registry and MCP servers

## Tool Call States

```
validating → scheduled → executing → success
           ↘         ↗              ↘ error
            awaiting_approval        ↘ cancelled
```

1. **validating** - Initial state, checking permissions and tool availability
2. **scheduled** - Ready for execution, queued for processing  
3. **executing** - Currently running, may stream output
4. **awaiting_approval** - Waiting for user confirmation (dangerous operations)
5. **success** - Completed successfully with result
6. **error** - Failed with error message
7. **cancelled** - Cancelled by user or system

## Usage Examples

### Basic Tool Execution

```typescript
import { ToolCallScheduler } from './tool-call-scheduler'
import { ToolRegistry } from './tool-registry'

// Create registry and scheduler
const toolRegistry = new ToolRegistry(eventBus, logger)
const scheduler = new ToolCallScheduler({
  toolRegistry: Promise.resolve(toolRegistry),
  eventBus,
  logger,
  approvalMode: ApprovalMode.DEFAULT
})

// Execute a tool call
const result = await scheduler.execute(
  {
    callId: "calc-001",
    name: "calculator", 
    args: { operation: "add", a: 10, b: 5 }
  },
  "message-123",
  { chatId: "chat-456", messageId: "message-123" }
)
```

### Registering Built-in Tools

```typescript
const fileTool: Tool = {
  name: "write_file",
  description: "Write content to a file",
  inputSchema: { /* JSON schema */ },
  
  async shouldConfirmExecute(args) {
    // Return confirmation details for dangerous operations
    return {
      message: `Write to file: ${args.path}`,
      dangerLevel: "medium",
      affectedResources: [args.path],
      onConfirm: async (outcome) => { /* handle confirmation */ }
    }
  },
  
  async execute(args, options) {
    // Tool implementation with optional streaming
    if (options.onOutput) {
      options.onOutput("Writing file...\n")
    }
    return { success: true, path: args.path }
  },
  
  getMetadata() {
    return { name: "write_file", description: "...", category: "file" }
  }
}

toolRegistry.registerTool(fileTool)
```

### MCP Server Integration

```typescript
// Register an MCP server
await toolRegistry.registerMCPServer({
  name: "github-mcp",
  url: "http://localhost:3001", 
  enabled: true,
  category: "development",
  oauth: {
    enabled: true,
    clientId: "your-client-id",
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: ["repo", "user"]
  }
})
```

## tRPC API Routes

The tool call system exposes the following tRPC routes:

- `toolCall.schedule` - Execute tool calls
- `toolCall.confirm` - Confirm/deny tool calls awaiting approval
- `toolCall.cancel` - Cancel tool calls for a message
- `toolCall.getToolCalls` - Get tool call status for a message
- `toolCall.getPendingApprovals` - Get pending approval requests
- `toolCall.listTools` - List available tools
- `toolCall.registerMCPServer` - Register new MCP server
- `toolCall.getHealth` - Check tool registry health

## Events

The system emits the following events:

- `TOOL_REGISTERED` - When a tool is registered
- `MCP_SERVER_REGISTERED` - When an MCP server is registered  
- `TOOL_PERMISSION_REQUEST` - When user confirmation is needed
- `TOOL_OUTPUT_UPDATE` - Real-time tool output streaming
- `TOOL_CALLS_UPDATE` - Tool call status updates
- `TOOL_CALLS_COMPLETE` - All tool calls in a batch completed

## Demo Script

Run the comprehensive demo:

```bash
cd packages/events-core
pnpm tool-call-demo
```

The demo demonstrates:
- Auto-approved tool calls (calculator)
- User confirmation workflow (file operations)
- Batch tool execution
- MCP server integration
- Tool registry health checks
- Real-time streaming output

## Integration with EnhancedChatSession

The tool call system is fully integrated with the `EnhancedChatSession` class:

- Automatically processes tool calls from AI responses
- Handles user confirmations in chat flow
- Continues conversation after tool execution
- Supports streaming tool output in chat

## Security Features

- **Risk assessment** - Tools are categorized by danger level (low/medium/high)
- **User confirmation** - Dangerous operations require explicit approval
- **Resource tracking** - Shows which files/resources will be affected
- **Preview changes** - Shows what the tool will do before execution
- **Cancellation** - Users can cancel tool execution at any time
- **OAuth integration** - Secure authentication for MCP servers

## Testing

The implementation includes comprehensive error handling and graceful degradation:

- Network failures for MCP servers
- Tool execution timeouts and cancellation
- Invalid tool arguments and schema validation
- Permission denied scenarios
- Concurrent tool call management

## Future Enhancements

- Tool call result caching
- Tool execution sandboxing
- Advanced permission policies
- Tool call analytics and monitoring
- Integration with external security scanners