# Web UI 設計

## 完整版工作區頁面

```
┌─────── Explorer (280px) ─────────┐ ┌─────── Chat (彈性) ─────────────┐ ┌─────── Preview (360px) ──────────┐
│ 🏠                               │ │                                 │ │                                  │
│                                 │ │ 🏠 Home > 👥 Workspace          │ │ 🏠 Home > 👥 Workspace           │
│ ▼ workspace                     │ │ > t21-hello_world > s0-planning │ │ > t21-hello_world > s1-implement │
│   ▼ t21-hello_world 🏃          │ │                                 │ │                                  │
│     [+ 新聊天]                   │ │ t21-hello_world >               │ │ t21-hello_world >                │
│     ▼ s0-planning ✓             │ │   s0-planning >                 │ │   s1-implementation >            │
│       [+ 新聊天]                 │ │     c01-20240121_153000.chat.js │ │     navbar.v1.py                │
│       💬 c01-20240121_153000.. │ │                                 │ │                                  │
│       💬 c02-20240121_154500.. │ │ [User] 請按照需求編寫...        │ │ [操作按鈕]                        │
│                                │ │                                │ │ ✏️ Edit  ⬇️ Download  📤 Share    │
│     ▼ s1-implementation 🏃      │ │ [AI] 我已分析完需求...           │ │                                  │
│       [+ 新聊天]                 │ │                                │ │ [預覽/編輯區域]                    │
│       💬 c01-20240121_153000.. │ │ [User] 這部分需要調整...        │ │ def create_navbar():             │
│       💬 c02-20240121_154500.. │ │                                │ │     # Navbar implementation      │
│       📄 navbar.v1.py          │ │ [AI] 根據反饋，我建議...         │ │     ...                         │
│       📄 navbar.v2.py          │ │                                │ │                                  │
│       📄 api-spec.md           │ │ 👤 Alice 正在編輯...             │ │                                  │
│                                │ │ 👤 Bob 正在查看...              │ │                                  │
│     ▼ task_history            │ │                                │ │                                  │
│       [+ 新聊天]                │ │                                │ │                                  │
│       📄 task.20240121_1530.. │ │                                │ │                                  │
│       📄 task.20240121_1545.. │ │                                │ │                                  │
│                                │ │--------------------------------│ │                                  │
│     📄 task.json              │ │ [輸入區]                       │ │                                  │
│                                │ │ ╭─────────────────────────╮    │ │                                  │
│   ► t20-feature_xyz ✓         │ │ │Write a message...       │    │ │                                  │
│   ► t19-bug_fix ✓             │ │ ╰─────────────────────────╯    │ │                                  │
│                                │ │ [📎附件] [🎨插入] [發送 ➤]       │ │                                  │
│ [視圖切換]                      │ │                                │ │                                  │
│ 📁 EXPLORER                    │ │                                │ │                                  │
│ 🔍 SEARCH                      │ │                                │ │                                  │
│ ⚙️ SETTINGS                    │ │                                │ │                                  │
└────────────────────────────────┘ └────────────────────────────────┘ └──────────────────────────────────┘
```

## MVP 簡化版

```
┌─────── Explorer (280px) ─────────┐ ┌─────── Chat/Preview (彈性) ───────────────────────────────────────┐
│ 🏠                               │ │                                                                  │
│                                 │ │ 🏠 Home > 👥 Workspace > t21-hello_world > s2-development        │
│ [+ 新任務]                       │ │ > c01-20240121_153000.chat.json                                  │
│                                 │ │                                                                  │
│ ▼ workspace                     │ │ [內容區域]                                                       │
│   ▼ t21-hello_world 🏃 ⏸️        │ │ # 聊天檔案時：                                                   │
│     [+ 新聊天]                   │ │ [User] 請按照需求編寫...                                         │
│     ▼ s1-planning ✓ ▶️          │ │                                                                  │
│       [+ 新聊天]                 │ │ [AI] 我已分析完需求...                                           │
│       💬 c01-20240121_153000.. │ │                                                                  │
│       💬 c02-20240121_154500.. │ │ [User] 這部分需要調整...                                         │
│                                │ │                                                                  │
│     ▼ s2-development 🔴 🔍      │ │ [AI] 根據反饋，我建議...                                         │
│       [+ 新聊天]                │ │                                                                  │
│       💬 c01-20240121_153000.. │ │                                                                  │
│       📄 navbar.v1.py          │ │                                                                  │
│       📄 navbar.v2.py          │ │                                                                  │
│       📄 api-spec.md           │ │                                                                  │
│                                │ │                                                                  │
│     ▼ s3-testing ⚠️            │ │                                                                  │
│       [+ 新聊天]                │ │                                                                  │
│       (無檔案)                  │ │ # 一般檔案時：                                                   │
│                                │ │ [檔案內容預覽/編輯]                                              │
│     ▼ s4-deployment 📝 ▶️      │ │                                                                  │
│       [+ 新聊天]                │ │                                                                  │
│       (無檔案)                  │ │                                                                  │
│                                │ │--------------------------------                                  │
│     📄 task.json              │ │ ╭─────────────────────────╮                                     │
│                                │ │ │Write a message...       │                                     │
│   ► t20-feature_xyz ✓ ▶️       │ │ ╰─────────────────────────╯                                     │
│   ► t19-bug_fix ✓ ▶️           │ │ [📎附件] [發送 ➤]                                               │
│                                │ │                                                                  │
│ ⚙️ SETTINGS                    │ │                                                                  │
└────────────────────────────────┘ └──────────────────────────────────────────────────────────────────┘
```

---

# 完整版工作區頁面 (使用 WorkspaceLayout)

```
┌─────── ExplorerPanel (280px) ────────┐ ┌─────── ChatPanel (彈性) ───────────┐ ┌─────── PreviewPanel (360px) ────────┐
│ <Breadcrumb/>                        │ │                                    │ │                                     │
│                                     │ │ <Breadcrumb/>                      │ │ <Breadcrumb/>                       │
│ <ExplorerTree>                      │ │                                    │ │                                     │
│   ▼ workspace                       │ │ t21-hello_world >                  │ │ t21-hello_world >                   │
│   ▼ <TaskNode> t21-hello_world 🏃   │ │   s0-planning >                    │ │   s1-implementation >               │
│     <CreateButton/>                 │ │     c01-20240121_153000.chat.js    │ │     navbar.v1.py                    │
│     ▼ <SubtaskNode> s0-planning ✓   │ │                                    │ │                                     │
│       <CreateButton/>               │ │ <MessagesView>                     │ │ <ActionBar>                         │
│       <ChatNode/>                   │ │   <UserChatMessage/>               │ │   ✏️ Edit  ⬇️ Download  📤 Share     │
│       <ChatNode/>                   │ │                                    │ │ </ActionBar>                        │
│                                     │ │   <AssistantChatMessage/>          │ │                                     │
│     ▼ <SubtaskNode> s1-implement 🏃 │ │                                    │ │ <ContentView> or <CodeView>         │
│       <CreateButton/>               │ │   <UserChatMessage/>               │ │   def create_navbar():              │
│       <ChatNode/>                   │ │                                    │ │     # Navbar implementation         │
│       <ChatNode/>                   │ │   <AssistantChatMessage/>          │ │     ...                            │
│       <FileNode/>                   │ │                                    │ │ </ContentView>                      │
│       <FileNode/>                   │ │ </MessagesView>                    │ │                                     │
│       <FileNode/>                   │ │                                    │ │                                     │
│                                     │ │ <ActivityBanner>                   │ │                                     │
│     ▼ <SubtaskNode> task_history   │ │   👤 Alice 正在編輯...              │ │                                     │
│       <CreateButton/>               │ │   👤 Bob 正在查看...               │ │                                     │
│       <FileNode/>                   │ │ </ActivityBanner>                  │ │                                     │
│       <FileNode/>                   │ │                                    │ │                                     │
│                                     │ │--------------------------------    │ │                                     │
│     <FileNode/>                     │ │ <InputContainer>                   │ │                                     │
│                                     │ │   <MessageInput/>                  │ │                                     │
│   <TaskNode/> t20-feature_xyz ✓     │ │   <AttachmentButton/> <SendButton/>│ │                                     │
│   <TaskNode/> t19-bug_fix ✓         │ │ </InputContainer>                  │ │                                     │
│                                     │ │                                    │ │                                     │
│ </ExplorerTree>                     │ │                                    │ │                                     │
│ <ViewSwitch>                        │ │                                    │ │                                     │
│   📁 EXPLORER                       │ │                                    │ │                                     │
│   🔍 SEARCH                         │ │                                    │ │                                     │
│   ⚙️ SETTINGS                       │ │                                    │ │                                     │
│ </ViewSwitch>                       │ │                                    │ │                                     │
└────────────────────────────────────┘ └────────────────────────────────────┘ └─────────────────────────────────────┘
```

# MVP 簡化版 (使用 SplitLayout)

```
┌─────── ExplorerPanel (280px) ────────┐ ┌─────── ContentPanel (彈性) ─────────────────────────────────────────────┐
│ <Breadcrumb/>                        │ │                                                                       │
│                                     │ │ <ContentHeader>                                                       │
│ <CreateButton> [+ 新任務]            │ │   🏠 Home > 👥 Workspace > t21-hello_world > s2-development          │
│                                     │ │   > c01-20240121_153000.chat.json                                    │
│ <ExplorerTree>                      │ │ </ContentHeader>                                                      │
│   ▼ workspace                       │ │                                                                       │
│   ▼ <TaskNode> t21-hello_world 🏃 ⏸️ │ │ <MessagesView> or <FileView>                                         │
│     <CreateButton/>                 │ │   # 聊天檔案時：                                                      │
│     ▼ <SubtaskNode> s1-planning ✓ ▶️ │ │   <UserChatMessage/>                                                 │
│       <CreateButton/>               │ │                                                                       │
│       <ChatNode/>                   │ │   <AssistantChatMessage/>                                             │
│       <ChatNode/>                   │ │                                                                       │
│                                     │ │   <UserChatMessage/>                                                  │
│     ▼ <SubtaskNode> s2-develop 🔴 🔍 │ │                                                                       │
│       <CreateButton/>               │ │   <AssistantChatMessage/>                                             │
│       <ChatNode/>                   │ │                                                                       │
│       <FileNode/>                   │ │                                                                       │
│       <FileNode/>                   │ │                                                                       │
│       <FileNode/>                   │ │                                                                       │
│                                     │ │                                                                       │
│     ▼ <SubtaskNode> s3-testing ⚠️   │ │                                                                       │
│       <CreateButton/>               │ │                                                                       │
│       (無檔案)                      │ │   # 一般檔案時：                                                      │
│                                     │ │   <ContentView> or <CodeView>                                         │
│     ▼ <SubtaskNode> s4-deploy 📝 ▶️  │ │     [檔案內容預覽/編輯]                                              │
│       <CreateButton/>               │ │   </ContentView>                                                      │
│       (無檔案)                      │ │                                                                       │
│                                     │ │                                                                       │
│     <FileNode/>                     │ │--------------------------------                                       │
│                                     │ │ <InputContainer>                                                      │
│   <TaskNode/> t20-feature_xyz ✓ ▶️   │ │   <MessageInput/>                                                    │
│   <TaskNode/> t19-bug_fix ✓ ▶️       │ │   <AttachmentButton/> <SendButton/>                                  │
│                                     │ │ </InputContainer>                                                     │
│ </ExplorerTree>                     │ │                                                                       │
│ <IconButton> ⚙️ SETTINGS </IconButton>│ │                                                                      │
└────────────────────────────────────┘ └───────────────────────────────────────────────────────────────────────┘
```
