# Web UI 設計

## 完整版工作區頁面

```
┌─────── Explorer (280px) ─────────┐ ┌─────── Chat (彈性) ─────────────┐ ┌─────── Preview (360px) ──────────┐
│ 🏠                               │ │                                 │ │                                  │
│                                 │ │ 🏠 Home > 👥 Workspace          │ │ 🏠 Home > 👥 Workspace           │
│ ▼ workspace                     │ │ > t21-hello_world > s0-planning │ │ > t21-hello_world > s1-implement │
│   ▼ t21-hello_world 🏃 ⋮        │ │                                 │ │                                  │
│     [+ 新聊天]                   │ │ t21-hello_world >               │ │ t21-hello_world >                │
│     ▼ s0-planning ✓ ⋮           │ │   s0-planning >                 │ │   s1-implementation >            │
│       [+ 新聊天]                 │ │     c01-20240121_153000.chat.js │ │     navbar.v1.py                │
│       💬 c01-20240121_153000.. ⋮ │ │                                 │ │                                  │
│       💬 c02-20240121_154500.. ⋮ │ │ [User] 請按照需求編寫...        │ │ [操作按鈕]                        │
│                                │ │                                │ │ ✏️ Edit  ⬇️ Download  📤 Share    │
│     ▼ s1-implementation 🏃 ⋮     │ │ [AI] 我已分析完需求...           │ │                                  │
│       [+ 新聊天]                 │ │                                │ │ [預覽/編輯區域]                    │
│       💬 c01-20240121_153000.. ⋮ │ │ [User] 這部分需要調整...        │ │ def create_navbar():             │
│       💬 c02-20240121_154500.. ⋮ │ │                                │ │     # Navbar implementation      │
│       📄 navbar.v1.py ⋮         │ │ [AI] 根據反饋，我建議...         │ │     ...                         │
│       📄 navbar.v2.py ⋮         │ │                                │ │                                  │
│       📄 api-spec.md ⋮          │ │ 👤 Alice 正在編輯...             │ │                                  │
│                                │ │ 👤 Bob 正在查看...              │ │                                  │
│     ▼ task_history ⋮           │ │                                │ │                                  │
│       [+ 新聊天]                │ │                                │ │                                  │
│       📄 task.20240121_1530.. ⋮ │ │                                │ │                                  │
│       📄 task.20240121_1545.. ⋮ │ │                                │ │                                  │
│                                │ │--------------------------------│ │                                  │
│     📄 task.json ⋮             │ │ [輸入區]                       │ │                                  │
│                                │ │ ╭─────────────────────────╮    │ │                                  │
│   ► t20-feature_xyz ✓ ⋮        │ │ │Write a message...       │    │ │                                  │
│   ► t19-bug_fix ✓ ⋮            │ │ ╰─────────────────────────╯    │ │                                  │
│                                │ │ [📎附件] [🎨插入] [發送 ➤]       │ │                                  │
│                                │ │                                │ │                                  │
│ [視圖切換]                      │ │                                │ │                                  │
│ 📁 EXPLORER                    │ │                                │ │                                  │
│ 🔍 SEARCH                      │ │                                │ │                                  │
│ ⚙️ SETTINGS                    │ │                                │ │                                  │
└────────────────────────────────┘ └────────────────────────────────┘ └──────────────────────────────────┘
```

_註: ⋮ 表示 options button，只在鼠標懸停時顯示，移開後消失_

### 完整版工作區對應的 React 組件

#### 整體佈局

- `WorkspaceThreeColumnLayout` - 三欄工作區主佈局

#### 左側面板 (Explorer)

- `ExplorerPanel` - 左側資源管理器面板
  - `ExplorerHeader` - 頂部導航 (🏠)
  - `WorkspaceTreeView` - 工作區任務樹結構
    - `TaskTreeNode` - 任務節點 (t21-hello_world)
      - `TaskStatusBadge` - 任務狀態標記 (🏃, ✓)
      - `TaskOptionsButton` - 任務選項按鈕 (⋮)
    - `SubtaskTreeNode` - 子任務節點 (s0-planning, s1-implementation)
      - `SubtaskStatusBadge` - 子任務狀態標記 (✓, 🏃)
      - `SubtaskOptionsButton` - 子任務選項按鈕 (⋮)
    - `FileTreeNode` - 文件節點
      - `ChatFileNode` - 聊天文件節點 (💬)
      - `DocumentFileNode` - 文檔文件節點 (📄)
      - `FileOptionsButton` - 文件選項按鈕 (⋮)
    - `NewChatButton` - 新建聊天按鈕 ([+ 新聊天])
  - `ExplorerViewSwitch` - 資源管理器視圖切換器
    - `ExplorerViewButton` - 視圖切換按鈕 (📁 EXPLORER, 🔍 SEARCH, ⚙️ SETTINGS)

#### 中間面板 (Chat)

- `ChatPanel` - 聊天面板
  - `ChatNavigationHeader` - 聊天導航頂部
    - `NavigationBreadcrumb` - 導航麵包屑 (🏠 Home > 👥 Workspace > ...)
  - `ChatMessagesView` - 聊天消息列表
    - `UserChatMessage` - 用戶聊天消息 ([User] 請按照需求編寫...)
    - `AssistantChatMessage` - AI 助手聊天消息 ([AI] 我已分析完需求...)
  - `UserPresenceBanner` - 用戶在線狀態橫幅
    - `UserPresenceIndicator` - 用戶在線狀態指示器 (👤 Alice 正在編輯...)
  - `ChatInputContainer` - 聊天輸入區域
    - `ChatMessageInput` - 聊天輸入框 (Write a message...)
    - `FileAttachmentButton` - 文件附件按鈕 (📎)
    - `InsertContentButton` - 插入內容按鈕 (🎨)
    - `ChatSendButton` - 發送聊天按鈕 (➤)

#### 右側面板 (Preview)

- `PreviewPanel` - 內容預覽面板
  - `PreviewNavigationHeader` - 預覽導航頂部
    - `NavigationBreadcrumb` - 導航麵包屑 (🏠 Home > 👥 Workspace > ...)
  - `PreviewActionToolbar` - 預覽操作工具欄
    - `EditButton` - 編輯按鈕 (✏️)
    - `DownloadButton` - 下載按鈕 (⬇️)
    - `ShareButton` - 分享按鈕 (📤)
  - `FileContentView` - 文件內容視圖
    - `CodeFileView` - 代碼文件預覽 (def create_navbar():...)

## 新聊天/新任務 Prompt Input Modal

```
┌────────── Prompt Input Modal ──────────┐
│                                        │
│ ✏️ 新聊天 / 新任務                      │
│                                        │
│ ╭────────────────────────────────────╮ │
│ │請輸入提示詞...                      │ │
│ │                                    │ │
│ │                                    │ │
│ │                                    │ │
│ ╰────────────────────────────────────╯ │
│                                        │
└────────────────────────────────────────┘
```

### Prompt Input Modal 對應的 React 組件

- `PromptInputModal` - 提示詞輸入模態框
  - `ModalHeader` - 模態框標題 (✏️ 新聊天 / 新任務)
  - `PromptTextarea` - 提示詞文本輸入區 (請輸入提示詞...)

## MVP 簡化版

```
┌─────── Explorer (280px) ─────────┐ ┌─────── Chat/Preview (彈性) ───────────────────────────────────────┐
│ 🏠                               │ │                                                                  │
│                                 │ │ 🏠 Home > 👥 Workspace > t21-hello_world > s2-development        │
│ [+ 新任務]                       │ │ > c01-20240121_153000.chat.json                                  │
│                                 │ │                                                                  │
│ ▼ workspace                     │ │ [內容區域]                                                       │
│   ▼ t21-hello_world 🏃 ⏸️ ⋮       │ │ # 聊天檔案時：                                                   │
│     [+ 新聊天]                   │ │ [User] 請按照需求編寫...                                         │
│     ▼ s1-planning ✓ ▶️ ⋮         │ │                                                                  │
│       [+ 新聊天]                 │ │ [AI] 我已分析完需求...                                           │
│       💬 c01-20240121_153000.. ⋮ │ │                                                                  │
│       💬[x] c02-20240121_154500.. ⋮ │ │ [User] 這部分需要調整...                                         │
│                                │ │                                                                  │
│     ▼ s2-development 🔴 🔍 ⋮     │ │ [AI] 根據反饋，我建議...                                         │
│       [+ 新聊天]                │ │                                                                  │
│       💬 c01-20240121_153000.. ⋮ │ │                                                                  │
│       📄 navbar.v1.py ⋮         │ │                                                                  │
│       📄 navbar.v2.py ⋮         │ │                                                                  │
│       📄 api-spec.md ⋮          │ │                                                                  │
│                                │ │                                                                  │
│     ▼ s3-testing ⚠️ ⋮           │ │                                                                  │
│       [+ 新聊天]                │ │                                                                  │
│       (無檔案)                  │ │ # 一般檔案時：                                                   │
│                                │ │ [檔案內容預覽/編輯]                                              │
│     ▼ s4-deployment 📝 ▶️ ⋮     │ │                                                                  │
│       [+ 新聊天]                │ │                                                                  │
│       (無檔案)                  │ │                                                                  │
│                                │ │--------------------------------                                  │
│     📄 task.json ⋮             │ │ ╭─────────────────────────╮                                     │
│                                │ │ │Write a message...       │                                     │
│   ► t20-feature_xyz ✓ ▶️ ⋮      │ │ ╰─────────────────────────╯                                     │
│   ► t19-bug_fix ✓ ▶️ ⋮          │ │ [📎附件] [發送 ➤]                                               │
│                                │ │                                                                  │
│ ⚙️ SETTINGS                    │ │                                                                  │
└────────────────────────────────┘ └──────────────────────────────────────────────────────────────────┘
```

_註: ⋮ 表示 options button，只在鼠標懸停時顯示，移開後消失_

### MVP 簡化版對應的 React 組件

#### 整體佈局

- `WorkspaceTwoColumnLayout` - 雙欄工作區佈局

#### 左側面板 (Explorer)

- `ExplorerPanel` - 左側資源管理器面板
  - `ExplorerHeader` - 頂部導航 (🏠)
  - `NewTaskButton` - 新建任務按鈕 ([+ 新任務])
  - `WorkspaceTreeView` - 工作區任務樹結構
    - `TaskTreeNode` - 任務節點 (t21-hello_world)
      - `TaskStatusBadge` - 任務狀態標記 (🏃, ✓)
      - `TaskActionButton` - 任務動作按鈕 (⏸️)
      - `TaskOptionsButton` - 任務選項按鈕 (⋮)
    - `SubtaskTreeNode` - 子任務節點 (s1-planning, s2-development, s3-testing, s4-deployment)
      - `SubtaskStatusBadge` - 子任務狀態標記 (✓, 🔴, ⚠️, 📝)
      - `SubtaskActionButton` - 子任務動作按鈕 (▶️, 🔍)
      - `SubtaskOptionsButton` - 子任務選項按鈕 (⋮)
    - `FileTreeNode` - 文件節點
      - `ChatFileNode` - 聊天文件節點 (💬)
      - `DocumentFileNode` - 文檔文件節點 (📄)
      - `FileOptionsButton` - 文件選項按鈕 (⋮)
    - `NewChatButton` - 新建聊天按鈕 ([+ 新聊天])
  - `ExplorerViewButton` - 設置按鈕 (⚙️ SETTINGS)

#### 右側面板 (Chat/Preview)

- `ChatPreviewPanel` - 聊天與預覽組合面板
  - `CombinedNavigationHeader` - 組合面板導航頂部
    - `NavigationBreadcrumb` - 導航麵包屑 (🏠 Home > 👥 Workspace > ...)
  - `ContentSwitchView` - 內容切換視圖
    - `ChatMessagesView` - 聊天消息視圖
      - `UserChatMessage` - 用戶聊天消息 ([User] 請按照需求編寫...)
      - `AssistantChatMessage` - AI 助手聊天消息 ([AI] 我已分析完需求...)
    - `FileContentView` - 文件內容視圖
      - `CodeFileView` - 代碼文件預覽/編輯
      - `MarkdownFileView` - Markdown 文件預覽
  - `ChatInputContainer` - 聊天輸入區域
    - `ChatMessageInput` - 聊天輸入框 (Write a message...)
    - `FileAttachmentButton` - 文件附件按鈕 (📎)
    - `ChatSendButton` - 發送聊天按鈕 (➤)
