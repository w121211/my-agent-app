# MVP 階段簡化前端 UI 事件流設計

## 1. 資料夾與項目管理 (統一概念)

### 資料夾項目操作（適用於任務、子任務、一般資料夾）
```
UI_ExplorerItemToggled (點擊展開/折疊箭頭)
  → UI_ExplorerViewUpdated (更新展開/折疊狀態)
  
UI_ExplorerItemSelected (點擊項目)
  → UI_ContentViewChanged (更新內容區域)
  → UI_BreadcrumbsUpdated
  → (如果是任務/子任務) UI_StatusBarUpdated
```

### 項目狀態變更（統一 Task/Subtask 狀態管理）
```
UI_StatusIconClicked (點擊狀態圖標)
  → UI_StatusChangeRequested
  → ClientUpdateItemStatusCommand
  → ServerItemStatusUpdated
  → UI_ExplorerIconUpdated
  → UI_StatusBarUpdated
```

## 2. 聊天與檔案管理

### 新增項目（統一任務/聊天創建流程）
```
UI_NewItemButtonClicked ([+ 新任務] 或 [+ 新聊天])
  → UI_ChatViewActivated (開啟聊天介面)
  → ClientStartNewChatCommand (建立聊天檔案)
  → ServerChatCreated
  → UI_ExplorerItemAdded (新增項目到檔案樹)
  → (若是新任務) ServerTaskFolderCreated
  → UI_InputFieldFocused
```

### 聊天操作流程（簡化消息處理）
```
UI_MessageSubmitted (送出訊息)
  → ClientSubmitMessageCommand
  → UI_MessageDisplayed (立即顯示使用者訊息)
  → UI_AIResponsePending (顯示 AI 思考中)
  → ServerAgentResponseReceived (收到回應)
  → UI_AIResponseDisplayed
  → UI_ChatScrollToBottom
```

### 檔案操作（統一檔案處理）
```
UI_FileItemClicked (點擊檔案)
  → UI_FileViewActivated (顯示檔案內容)
  → UI_FileActionsShown (顯示操作按鈕)

UI_FileActionTriggered (點擊檔案操作按鈕)
  → UI_FileOperationStarted (下載/分享/編輯)
  → ServerFileOperationProcessed
  → UI_FileOperationCompleted
  → UI_NotificationShown
```

### 附件處理（簡化附件流程）
```
UI_FileAttached (點擊附件按鈕或拖放檔案)
  → UI_AttachmentPreviewShown
  → UI_MessageWithAttachmentSubmitted
  → ClientSubmitMessageWithAttachmentCommand
  → 繼續一般訊息處理流程
```

## 3. 任務完成流程

### 工作批准流程
```
UI_ApprovalRequested (輸入 /approve 或點擊批准按鈕)
  → ClientApproveWork
  → ServerSubtaskCompleted
  → UI_ItemStatusUpdated (更新狀態圖標為 ✓)
  → ServerNextSubtaskTriggered
  → UI_NextItemAutoSelected (自動移至下一項目)
  → UI_ChatViewActivated (顯示新子任務的初始聊天)
```

## 4. 界面控制（簡化）

### 面板調整
```
UI_PanelResized (拖動分隔線)
  → UI_LayoutUpdated (即時更新佈局)
```

### 視圖切換
```
UI_ViewModeChanged (點擊視圖切換按鈕)
  → UI_InterfaceUpdated (更新界面)
```

## 5. 系統通知（統一）

### 操作反饋
```
UI_OperationCompleted (操作完成)
  → UI_NotificationShown (顯示通知)
  → UI_NotificationAutoHidden (自動隱藏)

UI_OperationFailed (操作失敗)
  → UI_ErrorNotificationShown (顯示錯誤)
```

### 協作狀態（精簡）
```
ServerUserActivityReceived (收到協作者活動)
  → UI_CollaboratorIndicatorShown ("👤 User 正在...")
  → UI_CollaboratorIndicatorAutoHidden (閒置後自動隱藏)
```

## 6. 通用事件關係

```
前端 UI 事件 → 客戶端命令 → 服務器處理 → 服務器事件回應 → 前端 UI 更新
```

這個簡化的事件流設計適合 MVP 階段，專注於核心功能，合併相似概念，減少重複事件，並保持直觀的使用者體驗。