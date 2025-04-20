# 準備

## 現代最佳實踐

現代 React 開發中最普遍的做法是：

- 為緊密相關的組件使用層級式命名（特別是專屬於某個父組件的子組件）
- 對於可能在多處重用的通用組件使用上下文無關的命名
- 結合文件夾結構來組織相關組件，減少命名冗長度

統一命名規則：

- 使用 "Panel" 表示主要布局區域容器
- 使用 "View" 表示主要負責內容展示的組件
- 使用 "Container" 表示管理狀態或布局的邏輯容器
- 不添加後綴的名稱用於具體的 UI 元素

## 組件層級關係確認

```
App
  └── Workspace
       ├── Explorer
       ├── Chat
       ├── Preview
       └── ...其他面板
```

這種層級關係在 VS Code、JetBrains IDE 等開發工具中很常見

```
App (整個應用)
  └── WorkspaceLayout (工作環境布局)
       ├── ExplorerPanel (左側資源管理面板)
       │    └── [各種樹節點和按鈕]
       ├── ChatPanel (中間聊天/互動面板)
       │    └── [消息、輸入區等]
       └── PreviewPanel (右側預覽/內容面板)
            └── [內容視圖、操作按鈕等]
```

# 使用組合命名風格的 React 組件命名方案

根據最新 UI 設計，以下是採用組合命名（Composite Naming）風格的更新方案：

## 主要布局組件

- `WorkspaceThreeColumnLayout` - 完整版三欄工作區主布局
- `WorkspaceTwoColumnLayout` - MVP 版本雙欄工作區布局

## 左側面板 (Explorer)

- `ExplorerPanel` - 任務資源管理器面板
  - `ExplorerHeader` - 資源管理器頂部導航
  - `WorkspaceTreeView` - 工作區任務樹結構
  - `TaskTreeNode` - 任務樹節點
    - `TaskStatusBadge` - 任務狀態標記 (🏃, ✓, ⏸️)
    - `TaskActionButton` - 任務動作按鈕 (▶️, ⏸️)
    - `TaskOptionsButton` - 任務選項按鈕 (⋮)
  - `SubtaskTreeNode` - 子任務樹節點
    - `SubtaskStatusBadge` - 子任務狀態標記 (✓, 🔴, ⚠️, 📝)
    - `SubtaskActionButton` - 子任務動作按鈕 (▶️, 🔍)
    - `SubtaskOptionsButton` - 子任務選項按鈕 (⋮)
  - `FileTreeNode` - 文件樹節點
    - `ChatFileNode` - 聊天文件節點 (💬)
    - `DocumentFileNode` - 文檔文件節點 (📄)
    - `FileOptionsButton` - 文件選項按鈕 (⋮)
  - `NewChatButton` - 新建聊天按鈕
  - `NewTaskButton` - 新建任務按鈕
- `ExplorerViewSwitch` - 資源管理器視圖切換器
  - `ExplorerViewButton` - 資源管理器視圖按鈕 (📁, 🔍, ⚙️)

## 中間面板 (Chat)

- `ChatPanel` - 聊天面板
  - `ChatNavigationHeader` - 聊天導航頂部
    - `NavigationBreadcrumb` - 導航麵包屑
  - `ChatMessagesView` - 聊天消息列表
    - `ChatMessage` - 基本聊天消息組件
      - `UserChatMessage` - 用戶聊天消息
      - `AssistantChatMessage` - AI 助手聊天消息
  - `UserPresenceBanner` - 用戶在線狀態橫幅
    - `UserPresenceIndicator` - 用戶在線狀態指示器 (👤)
  - `ChatInputContainer` - 聊天輸入區域
    - `ChatMessageInput` - 聊天輸入框
    - `FileAttachmentButton` - 文件附件按鈕 (📎)
    - `InsertContentButton` - 插入內容按鈕 (🎨)
    - `ChatSendButton` - 發送聊天按鈕 (➤)

## 右側面板 (Preview)

- `PreviewPanel` - 內容預覽面板
  - `PreviewNavigationHeader` - 預覽導航頂部
    - `NavigationBreadcrumb` - 導航麵包屑
  - `PreviewActionToolbar` - 預覽操作工具欄
    - `EditButton` - 編輯按鈕 (✏️)
    - `DownloadButton` - 下載按鈕 (⬇️)
    - `ShareButton` - 分享按鈕 (📤)
  - `FileContentView` - 文件內容視圖
    - `CodeFileView` - 代碼文件預覽
    - `MarkdownFileView` - Markdown 文件預覽

## MVP 版本組合面板

- `ChatPreviewPanel` - 聊天與預覽組合面板
  - `CombinedNavigationHeader` - 組合面板導航頂部
    - `NavigationBreadcrumb` - 導航麵包屑
  - `ContentSwitchView` - 內容切換視圖
    - `ChatMessagesView` - 聊天消息視圖
    - `FileContentView` - 文件內容視圖
  - `ChatInputContainer` - 聊天輸入區域
    - `ChatMessageInput` - 聊天輸入框
    - `FileAttachmentButton` - 文件附件按鈕 (📎)
    - `ChatSendButton` - 發送聊天按鈕 (➤)

## 模態框組件

- `PromptInputModal` - 提示詞輸入模態框
  - `ModalHeader` - 模態框標題 (✏️ 新聊天 / 新任務)
  - `PromptTextarea` - 提示詞文本輸入區

## 共享組件

- `StatusBadge` - 狀態標記組件
- `ActionIconButton` - 操作圖標按鈕
- `CollapsibleSection` - 可折疊區塊
- `NavigationBreadcrumb` - 導航麵包屑
- `TaskProgressIndicator` - 任務進度指示器
- `OptionsButton` - 選項按鈕 (⋮)
- `TooltipWrapper` - 工具提示包裝器

## 命名原則：

1. 組合功能與結構特性於命名中
2. 頂層組件使用完整組合名稱（如 `WorkspaceThreeColumnLayout`）
3. 子組件保留關聯性但簡化組合（如 `ChatMessage` 而非 `ChatMessagingPanelMessage`）
4. 共享組件名稱反映其功能和用途
5. 圖標按鈕組件名稱反映其功能和圖標

這種更新後的命名方案保持了原有的命名風格，同時更全面地覆蓋了新 UI 設計中的所有組件，包括狀態指示器、動作按鈕和用戶在線狀態等新增元素。
