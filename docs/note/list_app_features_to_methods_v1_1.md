<!-- Prompt logs - for record-keeping only, do not reference.


FileSystemService
- 併入 FileService or ProjectFolderService？

Chat
- chat id vs absolute path，因為目前沒有資料庫，且 chat file 可以 clone，absolute path 似乎才是獨立的？

Chat mode
- 需要專門給一個區塊，跟 agent mode 一樣
- 包含 submit message 這些
- 總之就是 chat 基本功能

AgentService.startAgentLoop
- 簡單說明如何做？

AgentService.checkHumanInputNeeded(response)
- 我覺得這個不需要

FilePreviewService
- -> FileService ?

FilePreviewService.renderMarkdown(content)
- 需要嗎？
- 可以前端 render

FilePreviewService.convertToPreviewFormat(filePath, fileType) - 檔案轉換預覽格式
FilePreviewService.extractTextContent(filePath) - 提取文字內容
FilePreviewService.generatePreviewMetadata(filePath) - 預覽元資料
- 我覺得都不需要
- 過度設計了 -> MVP

File Reference (@)
- 有許多地方都做了這個功能 -> 重複了
- 要用 file reference service 還是 message processor 來處理？
    - 這可能更多的是跟整個 code 架構、分工有關

MessageProcessor
- 在我來看他主要是負責 pre, post process message？

Chat
- 依賴的 reference files, triggers（進階，暫時不做）
    - 如果有變動，即可重跑

AI response
- cache 機制

 -->

## 📁 **Project Folder / Explorer**

### ✅ **已實現**

- **專案資料夾管理**
  - `ProjectFolderService.addProjectFolder(absoluteProjectFolderPath, correlationId)`
  - `ProjectFolderService.removeProjectFolder(projectFolderId, correlationId)`
  - `ProjectFolderService.getAllProjectFolders()`
  - `ProjectFolderService.getFolderTree(absoluteProjectFolderPath)`
- **檔案監控**
  - `FileWatcherService.startWatchingFolder(absoluteFolderPath)`
  - `FileWatcherService.stopWatchingFolder(absoluteFolderPath)`
  - `ProjectFolderService.startWatchingAllProjectFolders(correlationId)`
- **路徑驗證與檢查**
  - `ProjectFolderService.isPathInProjectFolder(absolutePath)`
  - `ProjectFolderService.getProjectFolderForPath(absolutePath)`

### ❌ **待實現**

- **檔案系統操作** (併入 FileService)
  - `FileService.moveFile(sourcePath, targetPath)`
  - `FileService.deleteFile(filePath)`
  - `FileService.renameFile(oldPath, newPath)`
  - `FileService.createFile(filePath, content, fileType)`
  - `FileService.createDirectory(dirPath)`
- **檔案搜尋** (for @ reference 功能)
  - `FileService.searchFilesByName(query, projectFolderPath)`
  - `FileService.fuzzySearchFiles(query, projectFolderPath)`

---

## 💬 **Chat System**

### ✅ **已實現 - 基本 Chat 管理**

- **Chat 生命週期管理** (以 absolute path 為主要標識)
  - `ChatService.createChat(targetDirectory, newTask, mode, knowledge, prompt, model, correlationId)`
  - `ChatService.createEmptyChat(targetDirectoryAbsolutePath, correlationId)`
  - `ChatService.getChatByPath(absoluteFilePath)` - 主要介面
  - `ChatService.findChatById(chatId)` - 輔助介面 (較慢，需遍歷)
  - `ChatService.getAllChats()`
  - `ChatService.openChatFile(absoluteFilePath, correlationId)`
- **Chat 持久化**
  - `ChatRepository.createChat(chat, targetFolderAbsolutePath, correlationId)`
  - `ChatRepository.addMessage(absoluteFilePath, message, correlationId)`
  - `ChatRepository.updateMetadata(absoluteFilePath, metadata, correlationId)`

### ❌ **待實現 - Chat Mode (人機協作對話)**

- **Chat Mode 核心功能**
  - `ChatModeService.submitMessage(chatPath, message, attachments, correlationId)`
  - `ChatModeService.editMessage(chatPath, messageId, newContent)`
  - `ChatModeService.deleteMessage(chatPath, messageId)`
  - `ChatModeService.regenerateResponse(chatPath, messageId)`
  - `ChatModeService.setModel(chatPath, modelId)`
  - `ChatModeService.updatePromptDraft(chatPath, promptDraft)`

### ❌ **待實現 - Agent Mode (自循環執行)**

- **Agent Mode 核心功能**

  ```typescript
  // 簡單 Agent Loop 實作
  AgentModeService.startAgentLoop(chatPath, initialGoal, maxIterations = 10) {
    for (let i = 0; i < maxIterations; i++) {
      // 1. 取得最後一個 AI message
      const lastMessage = await this.getLastAIMessage(chatPath)

      // 2. 檢查是否需要停止（達成目標等）
      if (this.shouldStopAgent(lastMessage)) break

      // 3. AI 自己生成下一個 prompt/action
      const nextAction = await this.generateNextAction(chatPath)

      // 4. 執行這個 action
      await this.executeAction(chatPath, nextAction)

      // 5. 簡單等待避免過快循環
      await this.wait(1000)
    }
  }
  ```

  - `AgentModeService.pauseAgent(chatPath)`
  - `AgentModeService.resumeAgent(chatPath)`

### ❌ **待實現 - Run/Rerun Chat 系統**

- **Chat 執行控制**
  - `ChatService.runChat(chatPath, correlationId)` - 重新執行整個對話
  - `ChatService.rerunFromMessage(chatPath, messageIndex, correlationId)` - 從特定訊息重跑
  - `ChatService.stopRunningChat(chatPath)` - 停止執行中的對話

### ❌ **待實現 - Chat Versioning & Branching**

- **版本控制**
  - `ChatService.branchFromMessage(chatPath, messageId, newMessage, correlationId)` - 分支對話
  - `ChatBackupService.createBackup(chatPath)` - 創建備份
  - `ChatBackupService.listBackups(chatPath)` - 列出備份版本
  - `ChatBackupService.restoreFromBackup(chatPath, backupId)` - 恢復備份

### ❌ **待實現 - Extensions (透過 workflow 機制)**

- **內建擴展功能**
  - `ExtensionService.executeSummarize(chatPath)` - 對話摘要
  - `ExtensionService.executeWhatsNext(chatPath)` - 建議下一步
  - `WorkflowService.runWorkflow(workflowPath, inputData)` - 執行工作流

---

## 📄 **File System & Preview**

### ✅ **已實現**

- **基本檔案讀取**
  - `FileService.openFile(absoluteFilePath, correlationId)` - 支援文字和二進位檔案
  - `FileService.getFileType(filePath)` - 檔案類型識別
  - `FileService.isBinaryFile(fileType)` - 二進位檔案判斷

### ❌ **待實現**

- **檔案系統操作** (併入 FileService，移除獨立的 FileSystemService)
  - `FileService.moveFile(sourcePath, targetPath)`
  - `FileService.deleteFile(filePath)`
  - `FileService.renameFile(oldPath, newPath)`
  - `FileService.createFile(filePath, content)`
  - `FileService.createDirectory(dirPath)`
- **檔案搜尋** (for @ reference)
  - `FileService.searchFilesByName(query, projectFolderPath)`
  - `FileService.fuzzySearchFiles(query, projectFolderPath)`

> **註：** 移除過度設計的 FilePreviewService，前端負責 markdown 渲染等功能

---

## 🛠️ **Message Processing Pipeline**

### ✅ **已實現**

- **基本 AI 回應**
  - `AIService.generateResponse(userPrompt, options)`
  - `AIService.getAvailableModels()`
- **基礎檔案引用解析**
  - `ChatService.extractFileReferences(content)` - 簡單正則解析

### ❌ **待實現 - 統一訊息處理管道**

- **MessageProcessor (統一處理 @ 檔案引用和其他預處理)**

  ```typescript
  class MessageProcessor {
    // 預處理：檔案引用注入、輸入清理等
    async preprocessMessage(message, chatContext): Promise<ProcessedMessage> {
      // 1. 解析 @ references
      // 2. 讀取檔案內容並注入
      // 3. 其他預處理
    }

    // 後處理：artifact 提取、格式化等
    async postprocessResponse(
      response,
      chatContext,
    ): Promise<ProcessedResponse>;
  }
  ```

- **AI Response Cache**
  ```typescript
  class AIResponseCache {
    async getCachedResponse(prompt, model, context): Promise<string | null>;
    async setCachedResponse(prompt, model, context, response): Promise<void>;
    async invalidateCache(pattern): Promise<void>;
  }
  ```

---

## ⚙️ **System Services**

### ✅ **已實現**

- **使用者設定**
  - `UserSettingsService.getUserSettings()`
  - `UserSettingsService.updateUserSettings(settingsUpdate)`
- **事件系統**
  - `EventBus` - 完整的事件發布訂閱系統
  - 各種事件類型定義 (`ChatUpdatedEvent`, `FileWatcherEvent`, etc.)

### ❌ **待實現**

- **系統配置管理**
  - `ConfigService.getAIProviderConfig(providerId)`
  - `ConfigService.updateProviderSettings(providerId, settings)`
- **錯誤處理與恢復**
  - `ErrorRecoveryService.handleChatExecutionError(chatPath, error)`
  - `ErrorRecoveryService.createErrorReport(error, context)`

---

## 📊 **實現優先級建議**

### **P0 - 立即需要 (MVP 核心)**

1. **MessageProcessor** - 統一處理檔案引用 (@) 注入和訊息預處理
2. **ChatModeService** - Chat Mode 的完整功能 (submit, edit, regenerate 等)
3. **FileService 擴展** - 基本檔案操作 (move, delete, rename, search)
4. **ChatService.runChat()** - 基本 run chat 功能
5. **AIResponseCache** - AI 回應快取機制

### **P1 - 第二階段**

1. **AgentModeService** - Agent 自循環執行
2. **Chat Branching & Versioning** - 分支對話和版本控制
3. **Extensions via Workflow** - Summarize & What's Next
4. **檔案搜尋** - 支援 @ 引用的檔案搜尋

### **P2 - 優化階段**

1. **錯誤處理與恢復** - `ErrorRecoveryService`
2. **系統配置管理** - `ConfigService`
3. **進階 Chat 功能** - 複雜的重跑邏輯等

---

## 🏗️ **架構簡化總結**

**移除的過度設計：**

- ❌ `FileSystemService` → 併入 `FileService`
- ❌ `FilePreviewService` → 併入 `FileService` (前端負責渲染)
- ❌ `AgentService.checkHumanInputNeeded` → 不需要
- ❌ 複雜的檔案預覽功能 → MVP 不需要

**保留的核心架構：**

- ✅ `MessageProcessor` - 統一訊息處理管道
- ✅ `ChatModeService` & `AgentModeService` - 明確分離兩種模式
- ✅ `AIResponseCache` - 重要的效能優化
- ✅ 以 absolute path 為主的 Chat 管理方式

這樣的架構更適合 MVP 階段，避免過度設計，專注於核心功能實現。

---

## 🎯 **第一階段：建立核心執行引擎**

### 1. **MessageProcessingService** (最優先)

```
為什麼先做：這是整個系統的「心臟」
- 定義三種 message type：prompt template, AI response, tool call
- 實現 @{file_path} 和 {{inputData}} 的 injection 處理
- 建立安全檢查機制（只能存取 workspace 內檔案）
```

**具體步驟：**

- 先做簡單的 prompt template 處理（@{file_path} injection）
- 再加上 {{inputData}} 處理
- 最後加上 tool call 支援

### 2. **ChatService.runChat()** (緊接著)

```
為什麼第二個：有了 MessageProcessor 就能實現核心 workflow
- 自動備份機制（run0, run1...）
- 循序執行 message blocks
- 整合 MessageProcessingService
```

**驗證方式：**

- 建立一個簡單的 summarize chat template
- 測試 @{原chat檔案} 引用和執行

## 🚀 **第二階段：實現基本 Extension**

### 3. **WorkflowService** (快速看到成果)

```
為什麼第三個：馬上能展示實用功能
- @summarizeChat extension
- @whatsNext extension
- 為未來 extension 建立架構
```

**實現策略：**

- 先寫死幾個 workflow template（summarize.chat.json, whats-next.chat.json）
- 使用 JSON 配置而非 TSX，降低複雜度
- 測試 Extension 按鈕 → runChat(template) → 產生結果

### 4. **基本 ToolService** (擴充能力)

```
為什麼第四個：讓 chat 能執行實際操作
- 實現 saveTo 工具（儲存文字到檔案）
- 實現 loadFile 工具（讀取檔案內容）
- 為 MCP 整合做準備
```

## 🔧 **第三階段：完善核心體驗**

### 5. **ChatBackupService** (資料安全)

```
為什麼第五個：使用者開始依賴系統時需要安全保障
- run 版本控制（chat.run0.json, chat.run1.json）
- branch 版本控制（chat.v1.json, chat.v2.json）
- 復原機制
```

### 6. **Agent Mode 基礎** (自動化價值)

```
為什麼第六個：展示 AI 自主工作能力
- 基於 runChat 的循環執行
- 簡單的停止/繼續機制
- Human-in-the-loop 暫停點
```
