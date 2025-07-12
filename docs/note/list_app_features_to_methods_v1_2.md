# **AI輔助工作流程應用程式 - 功能實現方法清單**

## 📁 **Project Folder / Explorer**

### ✅ **已實現**

- **專案資料夾管理**

  - `ProjectFolderService.addProjectFolder(absoluteProjectFolderPath, correlationId)`
    - _用於：_ 新增 project folders，讓使用者可以組織工作空間
  - `ProjectFolderService.removeProjectFolder(projectFolderId, correlationId)`
    - _用於：_ 移除 project folders，清理不需要的工作空間
  - `ProjectFolderService.getAllProjectFolders()`
    - _用於：_ 載入 app 時顯示所有專案、Dashboard 顯示專案列表
  - `ProjectFolderService.getFolderTree(absoluteProjectFolderPath)`
    - _用於：_ Explorer 樹狀結構顯示、檔案瀏覽功能

- **檔案監控**

  - `FileWatcherService.startWatchingFolder(absoluteFolderPath)`
    - _用於：_ 監控檔案變更，觸發 Chat 重跑提示、更新 Explorer 顯示
  - `FileWatcherService.stopWatchingFolder(absoluteFolderPath)`
  - `ProjectFolderService.startWatchingAllProjectFolders(correlationId)`
    - _用於：_ App 啟動時自動監控所有專案資料夾

- **路徑驗證與檢查**
  - `ProjectFolderService.isPathInProjectFolder(absolutePath)`
    - _用於：_ 安全檢查，確保只能在 project folder 內創建 chat/task
  - `ProjectFolderService.getProjectFolderForPath(absolutePath)`
    - _用於：_ 決定 chat/task 屬於哪個專案，用於上下文推斷

### ❌ **待實現**

- **檔案系統操作**

  - `FileService.moveFile(sourcePath, targetPath)`
    - _用於：_ 重新組織專案結構、移動 chat files 到不同資料夾
  - `FileService.deleteFile(filePath)`
    - _用於：_ 清理無用檔案、刪除舊的 chat backups
  - `FileService.renameFile(oldPath, newPath)`
    - _用於：_ 重新命名 chat files、組織檔案結構
  - `FileService.createFile(filePath, content, fileType)`
    - _用於：_ 創建新檔案（如 AI 生成的程式碼檔案）
  - `FileService.createDirectory(dirPath)`
    - _用於：_ 創建新的子專案資料夾

- **檔案搜尋** _(P1 - 支援 @ 引用功能)_
  - `FileService.searchFilesByName(query, projectFolderPath)`
    - _用於：_ @ 檔案引用時的自動完成、快速找到目標檔案
  - `FileService.fuzzySearchFiles(query, projectFolderPath)`
    - _用於：_ 模糊搜尋檔案，改善 @ 引用的使用者體驗

---

## 💬 **Chat System**

### ✅ **已實現 - 基本 Chat 管理**

- **Chat 生命週期管理** _(以 absolute path 為主要標識)_

  - `ChatService.createChat(targetDirectory, newTask, mode, knowledge, prompt, model, correlationId)`
    - _用於：_ 新增 Chat 和 Agent 模式的對話、支援初始 prompt 設定
  - `ChatService.createEmptyChat(targetDirectoryAbsolutePath, correlationId)`
    - _用於：_ 快速建立空白對話，讓使用者開始對話
  - `ChatService.getChatByPath(absoluteFilePath)` - 主要介面
    - _用於：_ 打開現有 chat file、重新載入 chat 進行編輯
  - `ChatService.findChatById(chatId)` - 輔助介面 _(較慢，需遍歷)_
    - _用於：_ 通過 ID 查找 chat，主要用於事件處理
  - `ChatService.getAllChats()`
    - _用於：_ Dashboard 顯示所有對話列表、全域搜尋功能
  - `ChatService.openChatFile(absoluteFilePath, correlationId)`
    - _用於：_ 從檔案系統打開 chat，支援檔案拖拽打開

- **Chat 持久化**
  - `ChatRepository.createChat(chat, targetFolderAbsolutePath, correlationId)`
    - _用於：_ 將 chat 資料儲存為 .chat.json 檔案
  - `ChatRepository.addMessage(absoluteFilePath, message, correlationId)`
    - _用於：_ Chat 模式中追加新訊息、Agent 模式中記錄 AI 循環
  - `ChatRepository.updateMetadata(absoluteFilePath, metadata, correlationId)`
    - _用於：_ 更新 chat 設定（model、mode、knowledge 等）

### ❌ **待實現 - Chat Mode (人機協作對話)**

- **Chat Mode 核心功能**
  - `ChatService.submitMessage(chatPath, message, attachments, correlationId)`
    - _用於：_ Chat 模式的基本對話功能、支援檔案附件
  - `ChatService.editMessage(chatPath, messageId, newContent)`
    - _用於：_ 編輯已發送的訊息，觸發對話分支
  - `ChatService.regenerateResponse(chatPath, messageId)`
    - _用於：_ 重新生成 AI 回應，改善回應品質
    <!-- 不需要，本質等於 editMessage, regenerateResponse
  - `ChatService.setModel(chatPath, modelId)`
    - _用於：_ 切換 AI 模型，適應不同任務需求
      -->
  - `ChatService.savePromptDraft(chatPath, promptDraft)`
    - _用於：_ 儲存使用者正在輸入的草稿，避免意外遺失

### ❌ **待實現 - Agent Mode (自循環執行)**

- **Agent Mode 核心功能**
  - `AgentService.startAgentLoop(chatPath, maxIterations, correlationId)`
    - _用於：_ Agent 模式的全自動執行，AI 自主循環直到完成目標
    - _如何實現：_ 循環調用 `ChatService.runChat()` 和 AI 生成下一步
  - `AgentService.pauseAgent(chatPath)`
    - _用於：_ 暫停 Agent 執行，等待人工介入確認
  - `AgentService.resumeAgent(chatPath)`
    - _用於：_ 恢復 Agent 執行，繼續自動化流程

### ❌ **待實現 - Run/Rerun Chat 系統** _(核心功能)_

- **Chat 執行控制**
  - `ChatService.runChat(chatPath, inputData?, correlationId?)`
    - _用於：_ 核心功能 - 重新執行整個 chat workflow、Summarize/What's next 等 extension、支援 inputData 注入
    - _如何實現：_ 自動備份原 chat → 注入 inputData 到 {{inputData}} → 按順序執行每個 message block → 更新結果
  - `ChatService.stopRunningChat(chatPath)`
    - _用於：_ 停止執行中的 chat，處理意外情況
    <!-- 我看不到有需要的情況
  - `ChatService.rerunFromMessage(chatPath, messageIndex, inputData?, correlationId?)`
    - _用於：_ 從特定訊息重新執行，修復錯誤或改變執行路徑 -->
    <!-- chat execution status -> 應該會更新在 chat file，並且搭配 chat event
  - `ChatService.getChatExecutionStatus(chatPath)`
    - _用於：_ 檢查 chat 是否正在執行，避免重複執行、顯示執行狀態 -->

### ❌ **待實現 - Chat Versioning & Branching**

- **版本控制**
  - `ChatService.branchFromMessage(chatPath, messageId, newMessage, correlationId)`
    - _用於：_ 編輯 message 時自動分支，保留原版本
    - _如何實現：_ 調用 `createBackup("branch")` → 新檔案使用原名稱 → 從指定訊息開始新分支
  - `ChatBackupService.createBackup(chatPath, backupType)`
    - _用於：_ 統一的備份機制，支援 run 和 branch 兩種類型
    - _如何實現：_ run 類型 → chat_backup/chat1.run0.json；branch 類型 → chat1.v3.json
  - `ChatBackupService.getNextRunNumber(chatPath)`
    - _用於：_ 獲取下一個 run 編號，支援 run0, run1, run2... 命名
  - `ChatBackupService.getNextVersionNumber(chatPath)`
    - _用於：_ 獲取下一個版本編號，支援 v1, v2, v3... 命名
  - `ChatBackupService.listBackupHistory(chatPath)`
    - _用於：_ 顯示所有備份歷史（run 和 version），讓使用者選擇回復版本
  - `ChatBackupService.restoreFromBackup(chatPath, backupPath)`
    - _用於：_ 回復到指定備份版本，撤銷不滿意的修改

---

## 🛠️ **Message Processing Pipeline** _(核心基礎設施)_

### ✅ **已實現**

- **基本 AI 回應**
  - `AIService.generateResponse(userPrompt, options)`
    - _用於：_ 所有 AI 對話功能的核心、支援不同模型切換
  - `AIService.getAvailableModels()`
    - _用於：_ 模型選擇介面、顯示可用的 AI 模型

### ❌ **待實現 - 統一訊息處理管道**

- **MessageProcessingService**

  - `MessageProcessingService.processMessage(message, chatContext, inputData?)`
    - _用於：_ 統一處理三種 message type（prompt template, AI response, tool call）並處理所有 injection
    - _如何實現：_ 根據 message.role 決定處理方式 → prompt template 處理 `@{file_path}` 和 `{{inputData}}` → tool 走 function call → AI 走生成
  - `MessageProcessingService.validateFileAccess(filePath, workspacePath)`
    - _用於：_ 安全檢查，防止存取 workspace 外檔案或敏感檔案（.env 等）

- **ToolService**

  - `ToolService.executeTool(toolCall, context)`
    - _用於：_ 執行 function calls、MCP 整合、workflow 中的 tool messages
    - _如何實現：_ 解析 tool call → 執行對應 function → 回傳結果並注入下一個 message

- **WorkflowService**

  - `WorkflowService.runWorkflow(workflowPath, inputData, correlationId)`
    - _用於：_ 執行 workflow template 類型的 chat（包括 @summarizeChat, @whatsNext 等 extension）
    - _如何實現：_ 載入 workflow chat file → 將 inputData 傳遞給 ChatService.runChat() → 在 MessageProcessor 中處理 {{inputData}} 注入
  - `WorkflowService.executeExtension(extensionName, chatContext, correlationId)`
    - _用於：_ 執行預定義 extension 的便利方法
    - _如何實現：_ 準備 inputData（如當前 chat）→ 調用 runWorkflow()

- **AI Response Cache** _(P1 效能優化)_
  - `AIResponseCache.getCachedResponse(prompt, model, context)`
    - _用於：_ 避免重複 AI 調用，提升 rerun chat 效率
  - `AIResponseCache.setCachedResponse(prompt, model, context, response)`
    - _用於：_ 儲存 AI 回應，支援相同 prompt 快速回應
  - `AIResponseCache.invalidateCache(pattern)`
    - _用於：_ 當引用檔案變更時，清除相關 cache

---

## 📄 **File System & Preview**

### ✅ **已實現**

- **基本檔案讀取**
  - `FileService.openFile(absoluteFilePath, correlationId)`
    - _用於：_ 支援 @ 檔案引用、預覽各種檔案格式、支援文字和二進位檔案
  - `FileService.getFileType(filePath)`
    - _用於：_ 決定檔案處理方式、顯示適當的檔案圖示
  - `FileService.isBinaryFile(fileType)`
    - _用於：_ 區分文字和二進位檔案，決定處理策略

### ❌ **待實現**

- **檔案系統操作** _(整合到 FileService)_
  - `FileService.moveFile(sourcePath, targetPath)`
    - _用於：_ 重新組織專案結構、實現檔案拖拽移動
  - `FileService.deleteFile(filePath)`
    - _用於：_ 清理專案檔案、刪除不需要的 backup
  - `FileService.renameFile(oldPath, newPath)`
    - _用於：_ 重新命名檔案、改善檔案組織
  - `FileService.createFile(filePath, content)`
    - _用於：_ AI 生成檔案輸出、創建新文件
  - `FileService.createDirectory(dirPath)`
    - _用於：_ 創建專案子資料夾

---

## ⚙️ **System Services**

### ✅ **已實現**

- **使用者設定**

  - `UserSettingsService.getUserSettings()`
    - _用於：_ App 初始化載入、顯示使用者偏好設定
  - `UserSettingsService.updateUserSettings(settingsUpdate)`
    - _用於：_ 更新使用者偏好（不包含 project folders，由 ProjectFolderService 管理）

- **事件系統**
  - `EventBus` - 完整的事件發布訂閱系統
    - _用於：_ 所有模組間通訊、即時 UI 更新、檔案變更通知等

### ❌ **待實現**

- **系統配置管理** _(P1)_

  - `ConfigService.getAIProviderConfig(providerId)`
    - _用於：_ 管理不同 AI 模型的設定、API 金鑰等
  - `ConfigService.updateProviderSettings(providerId, settings)`
    - _用於：_ 更新 AI 提供商設定、切換模型配置

- **錯誤處理與恢復** _(P1)_
  - `ErrorRecoveryService.handleChatExecutionError(chatPath, error)`
    - _用於：_ Chat 執行失敗時的恢復機制、避免檔案損壞
  - `ErrorRecoveryService.createErrorReport(error, context)`
    - _用於：_ 收集錯誤資訊、協助使用者回報問題

---

## 📊 **實現優先級**

### **P0 - 立即需要 (MVP 核心)**

1. **MessageProcessingService** - 統一處理三種 message type 並整合所有 injection 處理（`@{file_path}`, `{{inputData}}` 等）
   - _為什麼：_ Chat 執行的核心邏輯，處理所有類型訊息和變數注入
2. **ChatService.runChat()** - 重新執行 chat workflow 的核心功能，支援 inputData
   - _為什麼：_ Summarize、What's next、Agent 模式等功能的基礎
3. **ToolService** - 執行 function calls 和 tool messages
   - _為什麼：_ 支援 MCP 整合、workflow 中的 tool 執行
4. **WorkflowService** - 執行 workflow 和 extension（@summarizeChat, @whatsNext）
   - _為什麼：_ Extension 機制的核心，實現 Summarize、What's next 等功能
5. **ChatService 執行狀態管理** - getChatExecutionStatus, stopRunningChat
   - _為什麼：_ 避免重複執行、提供執行狀態回饋

### **P1 - 第二階段**

1. **ChatBackupService (enhanced)** - 完整的 run 版本控制（run0, run1...）
2. **FileService 搜尋功能** - 支援 @ 引用的自動完成
3. **AgentModeService** - 基於 runChat 的自動循環執行
4. **AIResponseCache** - 效能優化，避免重複 AI 調用

### **P2 - 優化階段**

1. **ErrorRecoveryService** - 錯誤處理與恢復
2. **ConfigService** - 系統配置管理
3. **進階檔案操作** - move, delete, rename 等檔案管理功能

---

## 🎯 **核心設計理念**

1. **Chat = Workflow** - 每個 chat 都是可重複執行的工作流程，支援三種 message type
2. **Extension = Special Workflow** - Summarize、What's next 等功能通過執行特殊 workflow 實現
3. **Path-based Management** - 以檔案路徑為主要標識，支援檔案系統操作
4. **Unified Message Processing** - MessageProcessingService 統一處理所有 injection（`@{file_path}`, `{{inputData}}`）和 message type
5. **External Input Data** - `{{inputData}}` 由外部 workflow 傳入，chat file 本身對內容無知，只作占位符
6. **Backup-first** - 每次執行前自動備份（run0, run1... / v1, v2...），確保資料安全
