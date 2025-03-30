# MVP UI 使用者交互流程設計

## ExplorerPanel

### 任務管理操作

點擊 NewTaskButton [+ 新任務]

- 系統開啟 PromptInputModal
- 使用者在 PromptTextarea 輸入任務需求描述
- 點擊確認按鈕
  - 系統在後端創建新任務與初始聊天檔案
  - 系統在 WorkspaceTreeView 中新增該 TaskTreeNode 並自動展開
  - TaskStatusBadge 顯示進行中狀態 (🏃)
  - 系統顯示已規劃的 SubtaskTreeNode 資料夾結構
  - 系統開啟初始聊天檔案

點擊 TaskTreeNode 上的 TaskOptionsButton (⋮)

- 系統顯示下拉選單
- 選擇狀態選項
  - 選擇暫停(⏸️)：TaskStatusBadge 更新為暫停狀態，系統暫停任務自動進行
  - 選擇繼續(🏃)：TaskStatusBadge 更新為進行中狀態，系統恢復任務自動進行
  - 選擇完成(✓)：TaskStatusBadge 更新為已完成狀態

點擊 TaskTreeNode 或其前方的展開/折疊圖標 (▼/►)

- ▼ 變為 ►：折疊子任務顯示
- ► 變為 ▼：展開子任務顯示
- 點擊任務名稱部分
  - 系統將焦點切換到該任務
  - 系統自動展開該任務的 SubtaskTreeNode 列表
  - 系統自動選擇第一個進行中的子任務

### 子任務管理操作

點擊 SubtaskTreeNode

- 系統在 ExplorerPanel 中高亮顯示該子任務
- NavigationBreadcrumb 更新顯示當前路徑
- 若子任務有聊天檔案，自動開啟最新的聊天檔案

點擊 SubtaskTreeNode 上的 SubtaskActionButton (▶️, 🔍)

- SubtaskStatusBadge 更新為適當狀態 (進行中🏃, 檢查中🔍)
- 系統開啟新聊天檔案

點擊 SubtaskTreeNode 上的 SubtaskOptionsButton (⋮)

- 系統顯示下拉選單
- 選擇觀看詳情：系統在 ChatPreviewPanel 開啟子任務詳情
- 選擇略過：系統將子任務標記為已略過，並進入下一個子任務

點擊 SubtaskTreeNode 下的 NewChatButton [+ 新聊天]

- 系統在後端創建新聊天檔案，生成時間戳記格式的檔案名稱
- 系統在 WorkspaceTreeView 中新增 ChatFileNode (💬) 並高亮
- 系統在 ChatPreviewPanel 開啟空白聊天介面
- 系統自動將輸入焦點設置在 ChatMessageInput

### 檔案操作

點擊 ChatFileNode (💬)

- 系統讀取聊天檔案內容
- 系統在 ChatPreviewPanel 顯示 ChatMessagesView
- 系統自動滾動到最新消息位置
- NavigationBreadcrumb 更新顯示當前路徑

點擊 DocumentFileNode (📄)

- 系統讀取檔案內容
- 系統在 ChatPreviewPanel 顯示 FileContentView
- NavigationBreadcrumb 更新顯示當前檔案路徑

點擊 FileTreeNode 上的 FileOptionsButton (⋮)

- 系統顯示下拉選單
- 選擇編輯：系統在 ChatPreviewPanel 切換到 FileContentView 的編輯模式
- 選擇下載：系統將檔案下載至使用者本地設備
- 選擇刪除：系統提示確認後刪除檔案

## ChatPreviewPanel

### 導航操作

點擊 CombinedNavigationHeader 中的 NavigationBreadcrumb 路徑節點

- 系統導航到對應層級
- 系統在 ExplorerPanel 中高亮對應層級
- ContentSwitchView 根據選擇的層級顯示相關內容

### 聊天操作

在 ContentSwitchView 顯示 ChatMessagesView 時：

在 ChatMessageInput 輸入文字

- 點擊 ChatSendButton [發送 ➤] 或按下 Enter 鍵
  - 系統將訊息顯示在 ChatMessagesView 中，標記為 UserChatMessage
  - 系統發送訊息到後端處理
  - 系統顯示 AI 回應中狀態
  - AI 回應後，系統將回應顯示為 AssistantChatMessage
  - 系統自動滾動到最新消息位置
  - 系統儲存聊天記錄到檔案

點擊 FileAttachmentButton [📎附件]

- 系統開啟檔案選擇器
- 使用者選擇檔案並確認
- 系統顯示檔案預覽
- 點擊 ChatSendButton [發送 ➤]
  - 系統將檔案與訊息一起上傳
  - 系統在 ChatMessagesView 顯示訊息與附加檔案

透過發送特定確認訊息批准子任務成果

- 系統識別確認訊息
- 系統將子任務的 SubtaskStatusBadge 更新為完成(✓)
- 系統自動切換到下一個子任務
- 系統為下一個子任務建立新聊天檔案

### 檔案預覽與編輯操作

在 ContentSwitchView 顯示 FileContentView 時：

檔案內容顯示區域上方操作按鈕

- 點擊 EditButton [✏️ Edit]：FileContentView 切換到編輯模式
- 點擊 DownloadButton [⬇️ Download]：下載檔案至本地
- 點擊 ShareButton [📤 Share]：開啟分享選項

### 面板調整操作

拖動 WorkspaceTwoColumnLayout 中的面板分隔線

- 系統調整 ExplorerPanel 與 ChatPreviewPanel 的寬度比例
- 面板內容根據新寬度自動調整顯示

## 狀態指示系統

### 任務與子任務狀態視覺指示

TaskStatusBadge 顯示任務狀態：

- 進行中(🏃)
- 已完成(✓)
- 暫停(⏸️)

SubtaskStatusBadge 顯示子任務狀態：

- 進行中(🏃)
- 已完成(✓)
- 待處理(📝)
- 警告(⚠️)
- 檢查中(🔍)
- 出錯(🔴)

### 使用者狀態指示

UserPresenceBanner 在 ChatMessagesView 中顯示：

- 👤 使用者名稱 正在編輯...
- 👤 使用者名稱 正在查看...
