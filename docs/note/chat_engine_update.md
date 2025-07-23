# Chat Engine 完整更新方案

## 核心架構決策

### 設計原則

- ChatClient 直接管理 session 池，避免額外抽象層
- ChatSessionRepository 純粹負責持久化，無狀態設計
- 重用現有 file-helpers 工具，不重新造輪子
- 簡化 API 設計，專注核心使用情境

### 三層職責分工

```typescript
ChatClient {
  // API facade + session 生命週期管理
  // 管理有限數量的 active sessions (LRU策略)
}

ChatSession {
  // 記憶體狀態管理 + 對話業務邏輯
  // 處理 AI 調用、工具執行、狀態轉換
}

ChatSessionRepository {
  // 純粹持久化層
  // 檔案讀寫操作，無快取邏輯
}
```

## ChatClient 設計

```typescript
interface ChatClient {
  // 核心對話操作
  sendMessage(
    chatSessionId: string,
    message: string,
    attachments?: MessageAttachment[],
  ): Promise<ConversationResult>;

  rerunChat(
    chatSessionId: string,
    inputData?: Record<string, any>,
  ): Promise<ConversationResult>;

  confirmToolCall(
    chatSessionId: string,
    toolCallId: string,
    outcome: "approved" | "denied",
  ): Promise<ConversationResult>;

  abortChat(chatSessionId: string): Promise<void>;

  // Session 管理
  createChat(
    targetDirectory: string,
    config?: CreateChatConfig,
  ): Promise<string>;

  getOrLoadChatSession(chatSessionId: string): Promise<ChatSession>;

  updateChat(
    chatSessionId: string,
    updates: Partial<SerializableChat>,
  ): Promise<void>;

  deleteChat(chatSessionId: string): Promise<void>;

  loadChatFromFile(filePath: string): Promise<string>;
}

interface CreateChatConfig {
  mode?: "chat" | "agent";
  model?: ChatModelConfig;
  knowledge?: string[];
  prompt?: string;
  newTask?: boolean;
}

interface MessageAttachment {
  fileName: string;
  content: string;
}
```

### ChatClient 內部結構

```typescript
class ChatClient {
  private sessions: Map<string, ChatSession> = new Map();
  private chatSessionRepository: ChatSessionRepository;
  private maxSessions: number = 10;

  // 核心流程
  async sendMessage(chatSessionId: string, message: string) {
    // 1. 確保 session 已載入
    const session = await this.getOrLoadChatSession(chatSessionId);

    // 2. 執行對話邏輯
    const result = await session.runTurn({
      type: "user_message",
      content: message,
    });

    // 3. 持久化更新
    await this.persistSession(session);

    return result;
  }

  private async getOrLoadChatSession(
    chatSessionId: string,
  ): Promise<ChatSession> {
    // 1. 檢查是否已在記憶體
    if (this.sessions.has(chatSessionId)) {
      return this.sessions.get(chatSessionId)!;
    }

    // 2. 檢查 session 池大小，必要時清理
    if (this.sessions.size >= this.maxSessions) {
      await this.evictLeastRecentlyUsedSession();
    }

    // 3. 從 repository 載入
    const chatData = await this.chatSessionRepository.load(chatSessionId);
    const session = ChatSession.fromJSON(
      chatData,
      this.eventBus,
      this.providerRegistry,
    );

    // 4. 加入 session 池
    this.sessions.set(chatSessionId, session);

    return session;
  }

  private async evictLeastRecentlyUsedSession(): Promise<void> {
    // LRU 邏輯：移除最少使用的 session
    // 先持久化再移除
  }

  private async persistSession(session: ChatSession): Promise<void> {
    const chatData = session.toJSON();
    await this.chatSessionRepository.save(chatData);
  }
}
```

## ChatSessionRepository 設計

```typescript
interface ChatSessionRepository {
  save(
    chatSession: SerializableChat,
    targetDirectory?: string,
  ): Promise<string>;
  load(chatSessionId: string): Promise<SerializableChat>;
  loadFromFile(filePath: string): Promise<SerializableChat>;
  delete(chatSessionId: string): Promise<void>;
}
```

### ChatSessionRepository 內部結構

```typescript
class ChatSessionRepository {
  private logger: Logger<ILogObj>;

  // 核心操作流程
  async save(
    chatSession: SerializableChat,
    targetDirectory?: string,
  ): Promise<string> {
    let filePath: string;

    // 1. 決定檔案路徑
    if (chatSession.absoluteFilePath) {
      // 更新現有檔案
      filePath = chatSession.absoluteFilePath;
    } else {
      // 新建檔案，生成編號
      filePath = await this.generateNewFilePath(targetDirectory!);
    }

    // 2. 轉換資料格式
    const fileData = this.convertToFileFormat(chatSession);

    // 3. 寫入檔案（重用現有工具）
    await writeJsonFile(filePath, fileData);

    return filePath;
  }

  async load(chatSessionId: string): Promise<SerializableChat> {
    // 1. 推算檔案路徑（需要建立映射機制）
    const filePath = await this.resolveFilePath(chatSessionId);

    // 2. 載入並轉換
    return this.loadFromFile(filePath);
  }

  async loadFromFile(filePath: string): Promise<SerializableChat> {
    // 1. 讀取檔案（重用現有工具）
    const fileData = await readJsonFile<unknown>(filePath);

    // 2. 驗證格式（重用現有 Schema）
    const validatedData = ChatFileDataSchema.parse(fileData);

    // 3. 轉換為 SerializableChat 格式
    return this.convertFromFileFormat(validatedData, filePath);
  }

  private async generateNewFilePath(targetDirectory: string): Promise<string> {
    // 重用現有的檔案編號邏輯
    await createDirectory(targetDirectory);
    const chatNumber = await this.getNextChatNumber(targetDirectory);
    return path.join(targetDirectory, `chat${chatNumber}.chat.json`);
  }

  private async getNextChatNumber(folderPath: string): Promise<number> {
    // 重用 ChatRepository 現有邏輯
    const files = await listDirectory(folderPath);
    // 找到最大編號 + 1
  }

  private convertToFileFormat(chatSession: SerializableChat): ChatFileData {
    // 轉換為檔案格式
    return {
      _type: "chat",
      id: chatSession.id,
      createdAt: chatSession.createdAt,
      updatedAt: chatSession.updatedAt,
      messages: chatSession.messages,
      metadata: chatSession.metadata,
      status: chatSession.status,
      fileStatus: chatSession.fileStatus,
      currentTurn: chatSession.currentTurn,
      maxTurns: chatSession.maxTurns,
    };
  }

  private convertFromFileFormat(
    fileData: ChatFileData,
    filePath: string,
  ): SerializableChat {
    // 轉換為記憶體格式
    return {
      id: fileData.id,
      absoluteFilePath: filePath,
      messages: fileData.messages,
      status: fileData.status || "idle",
      fileStatus: fileData.fileStatus || "ACTIVE",
      currentTurn: fileData.currentTurn || 0,
      maxTurns: fileData.maxTurns || 20,
      createdAt: fileData.createdAt,
      updatedAt: fileData.updatedAt,
      metadata: fileData.metadata,
    };
  }
}
```

## 與現有系統整合

### 1. ChatService 廢棄與替換

```typescript
// 舊的 tRPC router
export function createChatRouter(chatService: ChatService) {
  // 使用 ChatService 的各種方法
}

// 新的 tRPC router
export function createChatRouter(chatClient: ChatClient) {
  return router({
    sendMessage: publicProcedure
      .input(sendMessageSchema)
      .mutation(async ({ input, signal }) => {
        return chatClient.sendMessage(
          input.chatId,
          input.message,
          input.attachments,
        );
      }),

    // 其他路由改用 ChatClient
  });
}
```

### 2. 四個核心使用情境的支援

```typescript
// 1. Create empty chat file
const chatSessionId = await chatClient.createChat(targetDirectory, {});

// 2. Open a chat file
const session = await chatClient.getOrLoadChatSession(chatSessionId);

// 3. Send message in a chat
const result = await chatClient.sendMessage(chatSessionId, message);

// 4. Rerun a chat
const result = await chatClient.rerunChat(chatSessionId, inputData);
```

### 3. 路徑映射解決方案

由於需要從 chatSessionId 找到檔案路徑，有兩種策略：

**策略 A：掃描索引（推薦）**

```typescript
// 應用啟動時建立索引
class ChatEngineInitializer {
  async buildPathIndex(): Promise<Map<string, string>> {
    // 掃描所有 project folders
    // 建立 chatSessionId -> filePath 映射
    // 存到簡單的索引檔案或記憶體
  }
}
```

**策略 B：命名規則推算**

```typescript
// 基於專案結構推算可能路徑
private async resolveFilePath(chatSessionId: string): Promise<string> {
  // 根據 chatSessionId 推算可能的檔案位置
  // 在各個 project folder 中搜尋
}
```

## 設計優勢

### 1. 職責清晰

- ChatClient：專注 API 和生命週期管理
- ChatSessionRepository：專注純粹持久化
- 避免職責重疊和複雜快取邏輯

### 2. 重用現有解決方案

- file-helpers.ts 的檔案操作工具
- 現有的 Schema 驗證機制
- 現有的檔案編號生成邏輯

### 3. 可控複雜度

- 有限的 session 池控制記憶體使用
- LRU 策略確保常用 session 保持活躍
- 簡化的 API 減少維護負擔

### 4. 向後相容

- .chat.json 檔案格式保持不變
- 現有檔案無需遷移
- tRPC API 端點保持一致

這個設計在簡潔性、效能和功能完整性之間取得平衡，為 MVP 階段提供足夠功能，同時為未來擴展保留空間。
