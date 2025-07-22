## 🔌 **核心：Function Call / MCP 顯示**

**預期功能**

- Function call 執行過程的視覺化顯示
- MCP 工具調用結果呈現
- 權限確認對話框

**完成情形**

- ❌ **完全未實現** - 整個 MCP 整合的 UI 層完全缺失
- ❌ 無任何 Function call 相關的訊息類型處理

---

## 🏗️ **後端架構設計 (完整版)**

### 核心 ToolCallScheduler 設計

**WHY 維持完整複雜度**: 參考 gemini-cli CoreToolScheduler 的成熟架構，保持所有狀態機、事件處理和批量管理功能。

```typescript
// packages/events-core/src/services/tool-call/tool-call-scheduler.ts

// 完整狀態定義 (參考 CoreToolScheduler)
export type ValidatingToolCall = {
  status: "validating";
  request: ToolCallRequestInfo;
  tool: Tool;
  startTime?: number;
  outcome?: ToolConfirmationOutcome;
};

export type ScheduledToolCall = {
  status: "scheduled";
  request: ToolCallRequestInfo;
  tool: Tool;
  startTime?: number;
  outcome?: ToolConfirmationOutcome;
};

export type ErroredToolCall = {
  status: "error";
  request: ToolCallRequestInfo;
  response: ToolCallResponseInfo;
  durationMs?: number;
  outcome?: ToolConfirmationOutcome;
};

export type SuccessfulToolCall = {
  status: "success";
  request: ToolCallRequestInfo;
  tool: Tool;
  response: ToolCallResponseInfo;
  durationMs?: number;
  outcome?: ToolConfirmationOutcome;
};

export type ExecutingToolCall = {
  status: "executing";
  request: ToolCallRequestInfo;
  tool: Tool;
  liveOutput?: string;
  startTime?: number;
  outcome?: ToolConfirmationOutcome;
};

export type CancelledToolCall = {
  status: "cancelled";
  request: ToolCallRequestInfo;
  response: ToolCallResponseInfo;
  tool: Tool;
  durationMs?: number;
  outcome?: ToolConfirmationOutcome;
};

export type WaitingToolCall = {
  status: "awaiting_approval";
  request: ToolCallRequestInfo;
  tool: Tool;
  confirmationDetails: ToolCallConfirmationDetails;
  startTime?: number;
  outcome?: ToolConfirmationOutcome;
};

export type ToolCall =
  | ValidatingToolCall
  | ScheduledToolCall
  | ErroredToolCall
  | SuccessfulToolCall
  | ExecutingToolCall
  | CancelledToolCall
  | WaitingToolCall;

export type CompletedToolCall =
  | SuccessfulToolCall
  | CancelledToolCall
  | ErroredToolCall;

// 完整的事件處理機制 (參考 CoreToolScheduler)
export type ConfirmHandler = (
  toolCall: WaitingToolCall,
) => Promise<ToolConfirmationOutcome>;
export type OutputUpdateHandler = (
  toolCallId: string,
  outputChunk: string,
) => void;
export type AllToolCallsCompleteHandler = (
  completedToolCalls: CompletedToolCall[],
) => void;
export type ToolCallsUpdateHandler = (toolCalls: ToolCall[]) => void;

export interface ToolCallSchedulerOptions {
  toolRegistry: Promise<ToolRegistry>;
  outputUpdateHandler?: OutputUpdateHandler;
  onAllToolCallsComplete?: AllToolCallsCompleteHandler;
  onToolCallsUpdate?: ToolCallsUpdateHandler;
  approvalMode?: ApprovalMode;
  eventBus: IEventBus; // 整合 events-core 的事件系統
  logger: Logger<ILogObj>;
}

export class ToolCallScheduler {
  private toolRegistry: Promise<ToolRegistry>;
  private toolCalls: Map<string, ToolCall[]> = new Map(); // messageId -> ToolCall[]
  private outputUpdateHandler?: OutputUpdateHandler;
  private onAllToolCallsComplete?: AllToolCallsCompleteHandler;
  private onToolCallsUpdate?: ToolCallsUpdateHandler;
  private approvalMode: ApprovalMode;
  private eventBus: IEventBus;
  private logger: Logger<ILogObj>;
  private pendingConfirmations: Map<string, WaitingToolCall> = new Map();

  constructor(options: ToolCallSchedulerOptions) {
    this.toolRegistry = options.toolRegistry;
    this.outputUpdateHandler = options.outputUpdateHandler;
    this.onAllToolCallsComplete = options.onAllToolCallsComplete;
    this.onToolCallsUpdate = options.onToolCallsUpdate;
    this.approvalMode = options.approvalMode ?? ApprovalMode.DEFAULT;
    this.eventBus = options.eventBus;
    this.logger = options.logger;
  }

  // 主要執行入口 (完全參考 CoreToolScheduler.execute)
  async execute(
    request: ToolCallRequestInfo | ToolCallRequestInfo[],
    messageId: string,
    chatContext: ChatContext,
    signal?: AbortSignal,
  ): Promise<CompletedToolCall[]> {
    this.logger.info("Starting tool call execution", {
      messageId,
      requestCount: Array.isArray(request) ? request.length : 1,
    });

    const requestsToProcess = Array.isArray(request) ? request : [request];
    const toolRegistry = await this.toolRegistry;

    // 1. 創建初始 ToolCall 對象 (validating 狀態)
    const newToolCalls: ToolCall[] = requestsToProcess.map(
      (reqInfo): ToolCall => {
        const toolInstance = toolRegistry.getTool(reqInfo.name);
        if (!toolInstance) {
          return {
            status: "error",
            request: reqInfo,
            response: this.createErrorResponse(
              reqInfo,
              new Error(`Tool "${reqInfo.name}" not found`),
            ),
            durationMs: 0,
          };
        }
        return {
          status: "validating",
          request: reqInfo,
          tool: toolInstance,
          startTime: Date.now(),
        };
      },
    );

    // 2. 存儲工具調用並通知更新
    this.toolCalls.set(messageId, newToolCalls);
    this.notifyToolCallsUpdate(messageId);

    // 3. 處理每個工具調用的驗證和權限檢查
    for (const toolCall of newToolCalls) {
      if (toolCall.status !== "validating") continue;

      await this.processToolCallValidation(toolCall, messageId, signal);
    }

    // 4. 嘗試執行已調度的工具調用
    await this.attemptExecutionOfScheduledCalls(messageId, signal);

    // 5. 檢查並通知完成
    this.checkAndNotifyCompletion(messageId);

    return this.getCompletedToolCalls(messageId);
  }

  // 權限處理機制 (完全參考 CoreToolScheduler)
  private async processToolCallValidation(
    toolCall: ValidatingToolCall,
    messageId: string,
    signal?: AbortSignal,
  ): Promise<void> {
    const { request: reqInfo, tool: toolInstance } = toolCall;

    try {
      if (this.approvalMode === ApprovalMode.YOLO) {
        // 自動批准模式
        this.setStatusInternal(messageId, reqInfo.callId, "scheduled");
      } else {
        // 檢查是否需要確認
        const confirmationDetails = await toolInstance.shouldConfirmExecute(
          reqInfo.args,
          signal,
        );

        if (confirmationDetails) {
          // 需要用戶確認
          const wrappedConfirmationDetails: ToolCallConfirmationDetails = {
            ...confirmationDetails,
            onConfirm: (
              outcome: ToolConfirmationOutcome,
              payload?: ToolConfirmationPayload,
            ) =>
              this.handleConfirmationResponse(
                messageId,
                reqInfo.callId,
                confirmationDetails.onConfirm,
                outcome,
                signal,
                payload,
              ),
          };

          this.setStatusInternal(
            messageId,
            reqInfo.callId,
            "awaiting_approval",
            wrappedConfirmationDetails,
          );
          this.pendingConfirmations.set(
            reqInfo.callId,
            toolCall as WaitingToolCall,
          );

          // 發送權限請求事件到 event bus
          this.eventBus.emit("TOOL_PERMISSION_REQUEST", {
            type: "TOOL_PERMISSION_REQUEST",
            messageId,
            toolCallId: reqInfo.callId,
            confirmationDetails: wrappedConfirmationDetails,
            timestamp: new Date(),
          });
        } else {
          // 無需確認，直接調度
          this.setStatusInternal(messageId, reqInfo.callId, "scheduled");
        }
      }
    } catch (error) {
      this.setStatusInternal(
        messageId,
        reqInfo.callId,
        "error",
        this.createErrorResponse(
          reqInfo,
          error instanceof Error ? error : new Error(String(error)),
        ),
      );
    }
  }

  // 批量執行機制 (參考 CoreToolScheduler)
  private async attemptExecutionOfScheduledCalls(
    messageId: string,
    signal?: AbortSignal,
  ): Promise<void> {
    const toolCalls = this.toolCalls.get(messageId) || [];
    const scheduledCalls = toolCalls.filter(
      (tc) => tc.status === "scheduled",
    ) as ScheduledToolCall[];

    if (scheduledCalls.length === 0) return;

    this.logger.info("Executing scheduled tool calls", {
      messageId,
      count: scheduledCalls.length,
    });

    // 並行執行所有調度的工具調用
    await Promise.all(
      scheduledCalls.map((toolCall) =>
        this.executeSingleToolCall(messageId, toolCall, signal),
      ),
    );
  }

  // 單個工具執行 (支援實時輸出和進度更新)
  private async executeSingleToolCall(
    messageId: string,
    toolCall: ScheduledToolCall,
    signal?: AbortSignal,
  ): Promise<void> {
    const { request, tool } = toolCall;

    try {
      // 設置執行狀態
      this.setStatusInternal(messageId, request.callId, "executing");

      this.logger.info("Executing tool call", {
        messageId,
        toolCallId: request.callId,
        toolName: request.name,
      });

      // 執行工具 (支援流式輸出)
      const result = await tool.execute(request.args, {
        signal,
        onOutput: (chunk: string) => {
          // 更新實時輸出
          this.updateLiveOutput(messageId, request.callId, chunk);

          // 通知輸出更新
          this.outputUpdateHandler?.(request.callId, chunk);

          // 發送輸出事件
          this.eventBus.emit("TOOL_OUTPUT_UPDATE", {
            type: "TOOL_OUTPUT_UPDATE",
            messageId,
            toolCallId: request.callId,
            outputChunk: chunk,
            timestamp: new Date(),
          });
        },
      });

      // 成功完成
      const durationMs = Date.now() - (toolCall.startTime || 0);
      this.setStatusInternal(
        messageId,
        request.callId,
        "success",
        this.createSuccessResponse(request, result),
        { durationMs },
      );
    } catch (error) {
      // 執行失敗
      const durationMs = Date.now() - (toolCall.startTime || 0);
      this.setStatusInternal(
        messageId,
        request.callId,
        "error",
        this.createErrorResponse(
          request,
          error instanceof Error ? error : new Error(String(error)),
        ),
        { durationMs },
      );
    }
  }

  // 處理用戶確認響應 (完全參考 CoreToolScheduler)
  async handleConfirmationResponse(
    messageId: string,
    callId: string,
    originalOnConfirm: (outcome: ToolConfirmationOutcome) => Promise<void>,
    outcome: ToolConfirmationOutcome,
    signal?: AbortSignal,
    payload?: ToolConfirmationPayload,
  ): Promise<void> {
    this.logger.info("Handling confirmation response", {
      messageId,
      callId,
      outcome,
    });

    try {
      // 調用原始確認處理器
      await originalOnConfirm(outcome);

      // 更新工具調用狀態
      const toolCall = this.findToolCall(messageId, callId);
      if (toolCall) {
        toolCall.outcome = outcome;
      }

      if (outcome === "approved") {
        // 用戶批准，調度執行
        this.setStatusInternal(messageId, callId, "scheduled");
        await this.attemptExecutionOfScheduledCalls(messageId, signal);
      } else {
        // 用戶拒絕，取消執行
        this.setStatusInternal(
          messageId,
          callId,
          "cancelled",
          this.createCancelledResponse(callId, "User denied permission"),
        );
      }

      // 從待確認列表中移除
      this.pendingConfirmations.delete(callId);

      // 檢查是否所有工具調用都已完成
      this.checkAndNotifyCompletion(messageId);
    } catch (error) {
      this.logger.error("Error in confirmation response handling", error);
      this.setStatusInternal(
        messageId,
        callId,
        "error",
        this.createErrorResponse(
          { callId, name: "unknown", args: {} },
          error instanceof Error ? error : new Error(String(error)),
        ),
      );
    }
  }

  // 狀態更新機制 (參考 CoreToolScheduler 的完整狀態管理)
  private setStatusInternal(
    messageId: string,
    targetCallId: string,
    newStatus: ToolCall["status"],
    auxiliaryData?: any,
    extraData?: any,
  ): void {
    const toolCalls = this.toolCalls.get(messageId) || [];
    const updatedToolCalls = toolCalls.map((currentCall) => {
      if (
        currentCall.request.callId !== targetCallId ||
        currentCall.status === "success" ||
        currentCall.status === "error" ||
        currentCall.status === "cancelled"
      ) {
        return currentCall;
      }

      const existingStartTime = currentCall.startTime;
      const toolInstance = currentCall.tool;
      const outcome = currentCall.outcome;

      switch (newStatus) {
        case "success":
          return {
            request: currentCall.request,
            tool: toolInstance,
            status: "success",
            response: auxiliaryData,
            durationMs: extraData?.durationMs,
            outcome,
          } as SuccessfulToolCall;

        case "error":
          return {
            request: currentCall.request,
            status: "error",
            response: auxiliaryData,
            durationMs: extraData?.durationMs,
            outcome,
          } as ErroredToolCall;

        case "cancelled":
          return {
            request: currentCall.request,
            tool: toolInstance,
            status: "cancelled",
            response: auxiliaryData,
            durationMs: extraData?.durationMs,
            outcome,
          } as CancelledToolCall;

        case "awaiting_approval":
          return {
            request: currentCall.request,
            tool: toolInstance,
            status: "awaiting_approval",
            confirmationDetails: auxiliaryData,
            startTime: existingStartTime,
            outcome,
          } as WaitingToolCall;

        case "executing":
        case "scheduled":
        case "validating":
          return {
            ...currentCall,
            status: newStatus,
            startTime: existingStartTime,
          };

        default:
          return currentCall;
      }
    });

    this.toolCalls.set(messageId, updatedToolCalls);
    this.notifyToolCallsUpdate(messageId);
  }

  // 事件通知機制
  private notifyToolCallsUpdate(messageId: string): void {
    const toolCalls = this.toolCalls.get(messageId) || [];

    // 調用回調處理器
    this.onToolCallsUpdate?.(toolCalls);

    // 發送事件到 event bus
    this.eventBus.emit("TOOL_CALLS_UPDATE", {
      type: "TOOL_CALLS_UPDATE",
      messageId,
      toolCalls,
      timestamp: new Date(),
    });
  }

  private checkAndNotifyCompletion(messageId: string): void {
    const toolCalls = this.toolCalls.get(messageId) || [];
    const completedCalls = this.getCompletedToolCalls(messageId);

    if (completedCalls.length === toolCalls.length && toolCalls.length > 0) {
      this.logger.info("All tool calls completed", {
        messageId,
        totalCalls: toolCalls.length,
        successCount: completedCalls.filter((tc) => tc.status === "success")
          .length,
        errorCount: completedCalls.filter((tc) => tc.status === "error").length,
        cancelledCount: completedCalls.filter((tc) => tc.status === "cancelled")
          .length,
      });

      // 調用完成回調
      this.onAllToolCallsComplete?.(completedCalls);

      // 發送完成事件
      this.eventBus.emit("TOOL_CALLS_COMPLETE", {
        type: "TOOL_CALLS_COMPLETE",
        messageId,
        completedToolCalls: completedCalls,
        timestamp: new Date(),
      });
    }
  }

  // 工具調用查詢和管理
  getToolCalls(messageId: string): ToolCall[] {
    return this.toolCalls.get(messageId) || [];
  }

  getCompletedToolCalls(messageId: string): CompletedToolCall[] {
    const toolCalls = this.toolCalls.get(messageId) || [];
    return toolCalls.filter(
      (tc) =>
        tc.status === "success" ||
        tc.status === "error" ||
        tc.status === "cancelled",
    ) as CompletedToolCall[];
  }

  getPendingApprovals(): WaitingToolCall[] {
    return Array.from(this.pendingConfirmations.values());
  }

  // 取消和清理機制
  async cancelToolCalls(
    messageId: string,
    reason: string = "Cancelled by user",
  ): Promise<void> {
    const toolCalls = this.toolCalls.get(messageId) || [];
    const activeCalls = toolCalls.filter(
      (tc) =>
        tc.status === "validating" ||
        tc.status === "scheduled" ||
        tc.status === "executing" ||
        tc.status === "awaiting_approval",
    );

    for (const toolCall of activeCalls) {
      this.setStatusInternal(
        messageId,
        toolCall.request.callId,
        "cancelled",
        this.createCancelledResponse(toolCall.request.callId, reason),
      );
    }

    this.checkAndNotifyCompletion(messageId);
  }

  // 輔助方法
  private findToolCall(
    messageId: string,
    callId: string,
  ): ToolCall | undefined {
    const toolCalls = this.toolCalls.get(messageId) || [];
    return toolCalls.find((tc) => tc.request.callId === callId);
  }

  private updateLiveOutput(
    messageId: string,
    callId: string,
    output: string,
  ): void {
    const toolCalls = this.toolCalls.get(messageId) || [];
    const updatedToolCalls = toolCalls.map((tc) => {
      if (tc.request.callId === callId && tc.status === "executing") {
        return {
          ...tc,
          liveOutput: (tc.liveOutput || "") + output,
        } as ExecutingToolCall;
      }
      return tc;
    });

    this.toolCalls.set(messageId, updatedToolCalls);
    this.notifyToolCallsUpdate(messageId);
  }

  private createErrorResponse(
    request: ToolCallRequestInfo,
    error: Error,
  ): ToolCallResponseInfo {
    return {
      callId: request.callId,
      result: null,
      error: error.message,
      timestamp: new Date(),
    };
  }

  private createSuccessResponse(
    request: ToolCallRequestInfo,
    result: any,
  ): ToolCallResponseInfo {
    return {
      callId: request.callId,
      result,
      error: null,
      timestamp: new Date(),
    };
  }

  private createCancelledResponse(
    callId: string,
    reason: string,
  ): ToolCallResponseInfo {
    return {
      callId,
      result: null,
      error: `Cancelled: ${reason}`,
      timestamp: new Date(),
    };
  }
}
```

### 統一工具註冊系統

**WHY 保持複雜的註冊機制**: 支援內建工具、MCP 工具、動態工具發現等完整功能。

```typescript
// packages/events-core/src/services/tool-call/tool-registry.ts

export interface Tool {
  name: string;
  description: string;
  inputSchema: any; // JSON Schema for tool input validation

  // 權限檢查機制 (參考 gemini-cli)
  shouldConfirmExecute(
    args: Record<string, any>,
    signal?: AbortSignal,
  ): Promise<ToolConfirmationDetails | null>;

  // 執行工具 (支援流式輸出和中斷)
  execute(
    args: Record<string, any>,
    options: {
      signal?: AbortSignal;
      onOutput?: (chunk: string) => void;
      context?: ExecutionContext;
    },
  ): Promise<any>;

  // 工具元數據
  getMetadata(): ToolMetadata;
}

export interface ToolConfirmationDetails {
  message: string;
  dangerLevel: "low" | "medium" | "high";
  affectedResources: string[];
  previewChanges?: string;
  onConfirm: (outcome: ToolConfirmationOutcome) => Promise<void>;
}

export interface ExecutionContext {
  chatId: string;
  messageId: string;
  projectPath?: string;
  userId?: string;
}

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private mcpClients: Map<string, MCPClient> = new Map();
  private toolCategories: Map<string, string[]> = new Map();
  private logger: Logger<ILogObj>;
  private eventBus: IEventBus;

  constructor(eventBus: IEventBus, logger: Logger<ILogObj>) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  // 註冊內建工具
  registerTool(tool: Tool): void {
    this.logger.info("Registering built-in tool", { name: tool.name });
    this.tools.set(tool.name, tool);

    this.eventBus.emit("TOOL_REGISTERED", {
      type: "TOOL_REGISTERED",
      toolName: tool.name,
      toolType: "built-in",
      timestamp: new Date(),
    });
  }

  // 註冊 MCP 服務器 (完整的 MCP 整合)
  async registerMCPServer(serverConfig: MCPServerConfig): Promise<void> {
    this.logger.info("Registering MCP server", {
      serverName: serverConfig.name,
    });

    try {
      // 建立 MCP 連接
      const mcpClient = await MCPClient.connect(serverConfig);

      // 處理 OAuth 認證 (如果需要)
      if (serverConfig.oauth?.enabled) {
        await this.handleMCPOAuth(mcpClient, serverConfig);
      }

      // 獲取可用工具列表
      const toolsInfo = await mcpClient.listTools();
      const resourcesInfo = await mcpClient.listResources();
      const promptsInfo = await mcpClient.listPrompts();

      // 為每個 MCP 工具創建包裝器
      for (const toolInfo of toolsInfo) {
        const mcpTool = this.createMCPToolWrapper(
          toolInfo,
          mcpClient,
          serverConfig,
        );
        this.tools.set(toolInfo.name, mcpTool);

        // 分類管理
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

      this.eventBus.emit("MCP_SERVER_REGISTERED", {
        type: "MCP_SERVER_REGISTERED",
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

  // MCP OAuth 處理
  private async handleMCPOAuth(
    client: MCPClient,
    serverConfig: MCPServerConfig,
  ): Promise<void> {
    const oauthConfig = serverConfig.oauth!;

    // 檢查是否已有有效 token
    const existingToken = await MCPOAuthTokenStorage.getToken(
      serverConfig.name,
    );
    if (existingToken && !this.isTokenExpired(existingToken)) {
      // 使用現有 token
      await client.authenticate(existingToken.accessToken);
      return;
    }

    // 執行 OAuth 流程
    this.logger.info("Starting OAuth flow for MCP server", {
      serverName: serverConfig.name,
    });

    const authResult = await MCPOAuthProvider.performOAuthFlow(
      serverConfig.name,
      oauthConfig,
      serverConfig.url,
    );

    // 使用新 token 認證
    await client.authenticate(authResult.accessToken);
  }

  // MCP 工具包裝器創建
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
        args: Record<string, any>,
      ): Promise<ToolConfirmationDetails | null> {
        // MCP 工具的風險評估邏輯
        const dangerLevel = this.assessMCPToolDanger(
          toolInfo,
          args,
          serverConfig,
        );

        if (dangerLevel === "low") {
          return null; // 自動批准低風險操作
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

          // 調用 MCP 工具
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

      getMetadata() {
        return {
          name: toolInfo.name,
          description: toolInfo.description,
          category: serverConfig.category || "mcp",
          serverName: serverConfig.name,
          inputSchema: toolInfo.inputSchema,
        };
      },
    };
  }

  // 工具查詢和管理
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

  // 工具發現和健康檢查
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

    // 檢查內建工具
    for (const [name, tool] of this.tools.entries()) {
      try {
        // 嘗試基本的工具元數據檢查
        const metadata = tool.getMetadata();
        report.healthyTools++;
        report.details.set(name, { status: "healthy", metadata });
      } catch (error) {
        report.unhealthyTools++;
        report.details.set(name, { status: "unhealthy", error: String(error) });
      }
    }

    // 檢查 MCP 服務器健康狀態
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
```

### 與 EnhancedChatSession 整合

**WHY 這樣整合**: 將 ToolCallScheduler 完整整合到你們既有的 chat session 管理中。

```typescript
// packages/events-core/src/services/content-generator/enhanced-chat-session.ts 擴展

export class EnhancedChatSession {
  // ... 既有屬性
  private toolCallScheduler: ToolCallScheduler;
  private toolRegistry: ToolRegistry;

  constructor(
    data: SerializableChat,
    eventBus: IEventBus,
    registry: ProviderRegistry,
  ) {
    // ... 既有初始化

    // 初始化工具註冊系統
    this.toolRegistry = new ToolRegistry(eventBus, this.logger);

    // 初始化工具調用調度器
    this.toolCallScheduler = new ToolCallScheduler({
      toolRegistry: Promise.resolve(this.toolRegistry),
      eventBus,
      logger: this.logger,
      approvalMode: ApprovalMode.DEFAULT, // 或從 user settings 讀取
      outputUpdateHandler: (toolCallId, chunk) => {
        // 處理實時輸出
        this.handleToolOutputUpdate(toolCallId, chunk);
      },
      onAllToolCallsComplete: (completedCalls) => {
        // 處理工具調用完成
        this.handleToolCallsComplete(completedCalls);
      },
      onToolCallsUpdate: (toolCalls) => {
        // 處理狀態更新
        this.handleToolCallsUpdate(toolCalls);
      },
    });

    // 註冊內建工具
    this.registerBuiltInTools();

    // 註冊 MCP 服務器（從配置讀取）
    this.initializeMCPServers();
  }

  async runTurn(
    input: TurnInput,
    options?: { signal?: AbortSignal },
  ): Promise<ConversationResult> {
    // ... 既有的 turn 處理邏輯

    // 檢查 AI 響應是否包含工具調用
    if (result.toolCalls && result.toolCalls.length > 0) {
      return this.handleToolCalls(result.toolCalls, options?.signal);
    }

    // ... 繼續既有流程
  }

  private async handleToolCalls(
    toolCalls: ToolCallRequestInfo[],
    signal?: AbortSignal,
  ): Promise<ConversationResult> {
    // 創建工具調用消息
    const toolCallMessage: ChatMessage = {
      id: uuidv4(),
      role: "FUNCTION_EXECUTOR",
      content: `Executing ${toolCalls.length} tool calls`,
      timestamp: new Date(),
      metadata: {
        functionCalls: toolCalls,
      },
    };

    this.data.messages.push(toolCallMessage);

    // 使用 ToolCallScheduler 執行工具調用
    const completedCalls = await this.toolCallScheduler.execute(
      toolCalls,
      toolCallMessage.id,
      {
        chatId: this.id,
        messageId: toolCallMessage.id,
        projectPath: this.getProjectPath(),
      },
      signal,
    );

    // 檢查是否有工具調用需要用戶確認
    const pendingApprovals = this.toolCallScheduler.getPendingApprovals();
    if (pendingApprovals.length > 0) {
      this.data.status = "waiting_confirmation";
      return {
        status: "waiting_confirmation",
        toolCalls: pendingApprovals.map(this.convertToLegacyToolCall),
      };
    }

    // 所有工具調用都已完成，繼續對話
    const toolResults = completedCalls.map((tc) => ({
      id: tc.request.callId,
      result: tc.status === "success" ? tc.response.result : null,
      error: tc.status === "error" ? tc.response.error : null,
    }));

    // 將工具結果發送給 AI 繼續對話
    return this.runTurn(
      {
        type: "tool_results",
        results: toolResults,
      },
      options,
    );
  }

  // 處理用戶的工具調用確認
  async handleToolConfirmation(
    toolCallId: string,
    outcome: "approved" | "denied",
  ): Promise<ConversationResult> {
    await this.toolCallScheduler.handleConfirmationResponse(
      this.getCurrentMessageId(), // 當前 message ID
      toolCallId,
      async () => {}, // 原始 onConfirm 處理器
      outcome === "approved" ? "approved" : "denied",
    );

    // 檢查是否還有待確認的工具調用
    const pendingApprovals = this.toolCallScheduler.getPendingApprovals();
    if (pendingApprovals.length > 0) {
      return {
        status: "waiting_confirmation",
        toolCalls: pendingApprovals.map(this.convertToLegacyToolCall),
      };
    }

    // 所有確認完成，繼續執行
    this.data.status = "processing";
    return { status: "complete", content: "Tool execution completed" };
  }

  // 內建工具註冊
  private async registerBuiltInTools(): Promise<void> {
    // 文件操作工具
    this.toolRegistry.registerTool(new FileReadTool());
    this.toolRegistry.registerTool(new FileWriteTool());
    this.toolRegistry.registerTool(new FileSearchTool());

    // 項目管理工具
    this.toolRegistry.registerTool(new ProjectAnalysisTool());
    this.toolRegistry.registerTool(new TaskManagementTool());

    // ... 其他內建工具
  }

  // MCP 服務器初始化
  private async initializeMCPServers(): Promise<void> {
    try {
      // 從用戶設置讀取 MCP 配置
      const mcpConfig = await this.getMCPConfiguration();

      for (const serverConfig of mcpConfig.servers) {
        if (serverConfig.enabled) {
          await this.toolRegistry.registerMCPServer(serverConfig);
        }
      }
    } catch (error) {
      this.logger.error("Failed to initialize MCP servers", error);
    }
  }
}
```

---

## 🎨 **前端架構設計 (Svelte 修正版)**

### Svelte Stores 狀態管理

**WHY 使用 Svelte stores**: 你們已經建立了很好的 stores 架構，我們應該擴展既有的 stores 而非重新發明輪子。

```typescript
// src/stores/tool-call-store.ts - 新增工具調用 store
import { writable, derived, type Writable } from "svelte/store";
import type { ToolCall } from "../types/tool-call.types";

// 工具調用狀態管理 (參考 gemini-cli CoreToolScheduler)
export const toolCallsMap: Writable<Map<string, ToolCall[]>> = writable(
  new Map(),
);

// 衍生狀態 - 計算特定 message 的工具調用
export function getMessageToolCalls(messageId: string) {
  return derived(
    toolCallsMap,
    ($toolCallsMap) => $toolCallsMap.get(messageId) || [],
  );
}

// 衍生狀態 - 檢查是否有等待確認的工具調用
export const pendingApprovals = derived(toolCallsMap, ($toolCallsMap) => {
  const allToolCalls = Array.from($toolCallsMap.values()).flat();
  return allToolCalls.filter((tc) => tc.status === "awaiting_approval");
});

// 工具調用操作 functions
export const toolCallOperations = {
  updateToolCalls(messageId: string, toolCalls: ToolCall[]) {
    toolCallsMap.update((map) => {
      const newMap = new Map(map);
      newMap.set(messageId, toolCalls);
      return newMap;
    });
  },

  updateToolCallStatus(
    messageId: string,
    toolCallId: string,
    status: ToolCallStatus,
    data?: any,
  ) {
    toolCallsMap.update((map) => {
      const newMap = new Map(map);
      const toolCalls = newMap.get(messageId) || [];
      const updatedToolCalls = toolCalls.map((tc) =>
        tc.id === toolCallId ? { ...tc, status, ...data } : tc,
      );
      newMap.set(messageId, updatedToolCalls);
      return newMap;
    });
  },
};
```

### Svelte 組件設計

**WHY 這樣設計**: 參考你們既有的 `ChatPanel.svelte` 架構模式，使用 Svelte 5 的 `$effect` 和 `$state`。

```svelte
<!-- src/components/ToolCallMessage.svelte -->
<script lang="ts">
  import { Logger } from 'tslog';
  import { getMessageToolCalls, toolCallOperations } from '../stores/tool-call-store';
  import { eventBus } from '../services/event-bus';
  import ToolCallItem from './ToolCallItem.svelte';
  import OverallStatusBadge from './OverallStatusBadge.svelte';
  import { FunctionIcon } from 'svelte-bootstrap-icons';

  interface Props {
    messageId: string;
  }

  const { messageId }: Props = $props();
  const logger = new Logger({ name: 'ToolCallMessage' });

  // 使用 derived store 獲取此 message 的工具調用
  const messageToolCalls = getMessageToolCalls(messageId);

  // 事件監聽 - 類似你們 ChatPanel 的事件處理模式
  $effect(() => {
    const unsubscribe = eventBus.subscribe([
      'TOOL_CALLS_UPDATE',
      'TOOL_PERMISSION_REQUIRED',
      'TOOL_OUTPUT_CHUNK',
    ], handleToolEvent);

    return unsubscribe;
  });

  function handleToolEvent(event: ToolEvent) {
    switch (event.type) {
      case 'TOOL_CALLS_UPDATE':
        if (event.messageId === messageId) {
          toolCallOperations.updateToolCalls(event.messageId, event.toolCalls);
        }
        break;

      case 'TOOL_OUTPUT_CHUNK':
        // 更新執行中的輸出
        toolCallOperations.updateToolCallStatus(
          messageId,
          event.toolCallId,
          'executing',
          { liveOutput: event.chunk }
        );
        break;
    }
  }

  // 用戶操作處理 - 類似你們既有的 async function 模式
  async function handleToolCallAction(toolCallId: string, action: 'approve' | 'deny' | 'retry') {
    try {
      switch (action) {
        case 'approve':
        case 'deny':
          await toolCallScheduler.handleConfirmation(toolCallId, action);
          break;
        case 'retry':
          await toolCallScheduler.retryToolCall(toolCallId);
          break;
      }
    } catch (error) {
      logger.error(`Failed to ${action} tool call:`, error);
      showToast(`Failed to ${action} tool call`, 'error');
    }
  }
</script>

<div class="tool-call-message">
  <div class="tool-header">
    <FunctionIcon />
    <span>Function Calls</span>
    <OverallStatusBadge toolCalls={$messageToolCalls} />
  </div>

  {#each $messageToolCalls as toolCall (toolCall.id)}
    <ToolCallItem
      {toolCall}
      onApprove={() => handleToolCallAction(toolCall.id, 'approve')}
      onDeny={() => handleToolCallAction(toolCall.id, 'deny')}
      onRetry={() => handleToolCallAction(toolCall.id, 'retry')}
    />
  {/each}
</div>

<style>
  .tool-call-message {
    @apply bg-surface rounded-lg p-4 border border-border mb-4;
  }

  .tool-header {
    @apply flex items-center gap-2 mb-3 text-accent font-medium;
  }
</style>
```

```svelte
<!-- src/components/ToolCallItem.svelte -->
<script lang="ts">
  import type { ToolCall } from '../types/tool-call.types';
  import PermissionConfirmation from './PermissionConfirmation.svelte';
  import ExecutionProgress from './ExecutionProgress.svelte';
  import ResultDisplay from './ResultDisplay.svelte';
  import StatusIcon from './StatusIcon.svelte';

  interface Props {
    toolCall: ToolCall;
    onApprove: () => void;
    onDeny: () => void;
    onRetry: () => void;
  }

  const { toolCall, onApprove, onDeny, onRetry }: Props = $props();
</script>

<div class="tool-call-item status-{toolCall.status}">
  <!-- 工具基本資訊 -->
  <div class="tool-info">
    <span class="tool-name">{toolCall.name}</span>
    <StatusIcon status={toolCall.status} />
  </div>

  <!-- 權限確認區域 -->
  {#if toolCall.status === 'awaiting_approval'}
    <PermissionConfirmation
      {toolCall}
      {onApprove}
      {onDeny}
    />
  {/if}

  <!-- 執行進度 -->
  {#if toolCall.status === 'executing'}
    <ExecutionProgress {toolCall} />
  {/if}

  <!-- 結果顯示 -->
  {#if toolCall.status === 'success' || toolCall.status === 'error'}
    <ResultDisplay {toolCall} {onRetry} />
  {/if}
</div>

<style>
  .tool-call-item {
    @apply border rounded-md p-3 mb-2;
  }

  .status-validating { @apply border-yellow-300 bg-yellow-50; }
  .status-awaiting_approval { @apply border-orange-300 bg-orange-50; }
  .status-executing { @apply border-blue-300 bg-blue-50; }
  .status-success { @apply border-green-300 bg-green-50; }
  .status-error { @apply border-red-300 bg-red-50; }
  .status-cancelled { @apply border-gray-300 bg-gray-50; }

  .tool-info {
    @apply flex items-center justify-between mb-2;
  }

  .tool-name {
    @apply font-medium text-foreground;
  }
</style>
```

```svelte
<!-- src/components/PermissionConfirmation.svelte -->
<script lang="ts">
  import type { ToolCall } from '../types/tool-call.types';
  import { WarningTriangle } from 'svelte-bootstrap-icons';

  interface Props {
    toolCall: ToolCall;
    onApprove: () => void;
    onDeny: () => void;
  }

  const { toolCall, onApprove, onDeny }: Props = $props();
  const details = $derived(toolCall.confirmationDetails);
</script>

{#if details}
  <div class="permission-confirmation danger-{details.dangerLevel}">
    <div class="confirmation-message">
      <WarningTriangle class="danger-icon" />
      <p>{details.message}</p>
    </div>

    {#if details.affectedResources.length > 0}
      <div class="affected-resources">
        <p class="text-sm font-medium">Affected files:</p>
        <ul class="resource-list">
          {#each details.affectedResources as resource}
            <li>{resource}</li>
          {/each}
        </ul>
      </div>
    {/if}

    <div class="confirmation-actions">
      <button
        class="btn-primary"
        onclick={onApprove}
      >
        Allow
      </button>
      <button
        class="btn-outline"
        onclick={onDeny}
      >
        Deny
      </button>
    </div>
  </div>
{/if}

<style>
  .permission-confirmation {
    @apply bg-background border rounded-md p-3 mt-2;
  }

  .danger-low { @apply border-yellow-300; }
  .danger-medium { @apply border-orange-300; }
  .danger-high { @apply border-red-300; }

  .confirmation-message {
    @apply flex items-start gap-2 mb-3;
  }

  .danger-icon {
    @apply w-4 h-4 mt-0.5 text-orange-500 flex-shrink-0;
  }

  .affected-resources {
    @apply mb-3;
  }

  .resource-list {
    @apply list-disc list-inside text-sm text-muted;
  }

  .confirmation-actions {
    @apply flex gap-2;
  }

  .btn-primary {
    @apply px-3 py-1 bg-accent text-white rounded text-sm hover:bg-accent/90;
  }

  .btn-outline {
    @apply px-3 py-1 border border-border rounded text-sm hover:bg-surface;
  }
</style>
```

### 整合到既有的 ChatPanel

**WHY 這樣整合**: 參考你們既有的 `ChatPanel.svelte` 架構，在 message rendering 中添加工具調用支援。

```svelte
<!-- 在 ChatPanel.svelte 中的 message 渲染部分添加 -->
<script lang="ts">
  // 既有的 imports...
  import ToolCallMessage from './ToolCallMessage.svelte';

  // 既有的 state 和 logic...
</script>

<!-- 在既有的 messages 渲染區域中 -->
<div class="messages-container" bind:this={messagesContainer}>
  {#each $currentChatMessages as message (message.id)}
    <div class="message-wrapper">
      <!-- 既有的用戶和助理消息處理 -->
      {#if message.role === 'USER'}
        <!-- 既有的用戶消息組件 -->
      {:else if message.role === 'ASSISTANT'}
        <!-- 既有的助理消息組件 -->
      {:else if message.role === 'TOOL_CALL'}
        <!-- 新增：工具調用消息 -->
        <ToolCallMessage messageId={message.id} />
      {/if}
    </div>
  {/each}
</div>
```

### Service 層整合

**WHY 擴展既有服務**: 參考你們既有的 `chatService` 模式，添加工具調用處理。

```typescript
// src/services/tool-call-service.ts - 新服務
import { Logger } from "tslog";
import { trpcClient } from "../lib/trpc-client";
import { eventBus } from "./event-bus";
import type { ToolCall, ToolCallRequest } from "../types/tool-call.types";

class ToolCallService {
  private logger = new Logger({ name: "ToolCallService" });

  // 參考你們既有的 service 方法模式
  async scheduleToolCalls(
    requests: ToolCallRequest[],
    chatContext: ChatContext,
  ) {
    try {
      this.logger.info("Scheduling tool calls:", requests.length);

      // 調用後端 tRPC API
      const result = await trpcClient.toolCall.schedule.mutate({
        requests,
        chatId: chatContext.chatId,
        messageId: chatContext.messageId,
      });

      // 發送事件更新 UI (類似你們既有的事件模式)
      eventBus.emit("TOOL_CALLS_UPDATE", {
        messageId: chatContext.messageId,
        toolCalls: result.toolCalls,
      });

      return result;
    } catch (error) {
      this.logger.error("Failed to schedule tool calls:", error);
      throw error;
    }
  }

  async handleConfirmation(toolCallId: string, outcome: "approved" | "denied") {
    try {
      const result = await trpcClient.toolCall.confirm.mutate({
        toolCallId,
        outcome,
      });

      return result;
    } catch (error) {
      this.logger.error("Failed to handle tool call confirmation:", error);
      throw error;
    }
  }
}

export const toolCallService = new ToolCallService();
```

### tRPC API 整合

**WHY 擴展既有 API**: 跟隨你們既有的 tRPC router 模式。

```typescript
// 在既有的 tRPC router 中添加 toolCall router
export const toolCallRouter = router({
  schedule: publicProcedure
    .input(
      z.object({
        requests: z.array(toolCallRequestSchema),
        chatId: z.string(),
        messageId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      return toolCallScheduler.scheduleToolCalls(input.requests, {
        chatId: input.chatId,
        messageId: input.messageId,
      });
    }),

  confirm: publicProcedure
    .input(
      z.object({
        toolCallId: z.string(),
        outcome: z.enum(["approved", "denied"]),
      }),
    )
    .mutation(async ({ input }) => {
      return toolCallScheduler.handleConfirmation(
        input.toolCallId,
        input.outcome,
      );
    }),
});
```
