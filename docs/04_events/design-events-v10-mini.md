# Key Design Principles for Event Flow

1. **Command-driven approach**: Using `ClientOpenFile` as a command rather than a request creates a cleaner event pattern that aligns with the rest of the system.

2. **Event reduction**: Simplifying the flow by eliminating redundant events (like separate request/response pairs) makes the system more maintainable.

3. **Clear state transitions**: Each event represents a distinct state change in the system, making the flow easy to reason about.

4. **Separation of concerns**:

   - Generic file operations (`ClientOpenFile`, `ServerFileOpened`)
   - Application-specific processing (`ServerChatInitialized`)
   - UI updates (`UIChatPanelUpdated`, `ClientChatReady`)

5. **Consistent naming conventions**: Following established patterns in the codebase improves readability and reduces cognitive load.

6. **Progressive processing**: The flow moves logically from user interaction → command → server processing → client update.

7. **Composable events**: The design allows for reuse of the file opening sequence for different file types, with type-specific processing added as needed.

8. **Preservation of intent**: The event names clearly communicate what is happening at each step without implementation details.

## 二層結構（用戶流程+技術事件）

```
┌─────────────────────────────────────────┐
│      用戶流程 (User Flows)              │
│ 描述完整的用戶交互場景和預期結果          │
└───────────────────┬─────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│       技術事件 (Technical Events)       │
│ UI、Client和Server事件的集合             │
└─────────────────────────────────────────┘
```

## 建議的精簡事件命名約定

保留UI/Client/Server前綴，但確保事件名稱本身包含足夠的業務語義：

- `UICreateTaskButtonClicked` → 用戶界面事件
- `ClientTaskCreationRequested` → 前端業務邏輯請求
- `ServerTaskCreated` → 後端處理結果，已包含業務狀態變化

## 寫法範例

````markdown
# 流程 1: 創建新聊天

用戶點擊"新聊天"按鈕，輸入初始提示和選擇是否創建新任務，設定模型選項後提交，系統創建聊天並顯示聊天界面。

```txt
ClientCreateNewChat {newTask: boolean, mode: "chat"|"agent", knowledge: string[], prompt: string, model: string}

# If creating a new task

(if newTask === true)
→ ServerTaskFolderCreated
→ ServerTaskConfigFileCreated

...
```
````

---

# UI Event Flows for Chat Interactions

## Event 1: Create New Chat Flow

### User Experience

A user wants to start a new conversation with the AI. They click the "New Chat" button, configure their chat settings including whether to create a new task, select their model preference, and input their initial prompt. After submission, a new chat interface appears ready for interaction.

### Core Event Flow

```
ClientCreateNewChat {newTask: boolean, mode: "chat"|"agent", knowledge: string[], prompt: string, model: string}

# If creating a new task
(if newTask === true)
→ ServerTaskFolderCreated
→ ServerTaskConfigFileCreated

# Chat file creation
→ ServerChatFileCreated (under current folder)
→ ServerChatInitialized

# Chat mode processing
(if mode === "chat")
→ (Client Submit Chat Message Flow)

# Agent mode processing (not for MVP1)
(if mode === "agent")
→ ServerAgentRunInitiated
→ ServerAgentRunStarted
→ ... (omitted, not considered for MVP1)
```

### UI Event Flow

```
UINewChatButtonClicked
→ UINewChatModalDisplayed
  - UITaskCreationToggled (optional)
  - UIModelSelected (optional)
  - UIKnowledgeFilesAdded (via drag & drop or file selection)
  - UIInitialPromptEntered

→ UINewChatModalSubmitted
→ UILoadingIndicatorDisplayed
→ ClientCreateNewChat {payload}

# UI Updates based on server responses
→ UIFileExplorerUpdated (shows new chat file and task folder if created)
→ UIChatPanelActivated
→ UIInitialPromptDisplayed
→ UILoadingIndicatorForAIResponse
→ UIAIResponseDisplayed (when response is received)
→ UIChatInputReadyForNextMessage
```

## Event 2: Client Submit Chat Message Flow

### User Experience

A user in an active chat composes a message, potentially references files using the `#file` syntax, attaches documents if needed, and sends their message. They see their message appear in the chat, along with a loading indicator while the AI processes the response. The AI's response with any artifacts is then displayed.

### Core Event Flow

```
ClientSubmitUserChatMessage {chat_id, message, attachments}
→ ServerUserChatMessagePostProcessed (handles #references and knowledge)
→ ServerChatMessageAppended {role: "user", content, timestamp}
→ ServerChatFileUpdated
→ ServerChatUpdated

# Chat mode AI response
(if mode === "chat")
→ ServerAIResponseRequested
→ ServerAIResponseGenerated
→ ServerAIResponsePostProcessed (handles artifacts and formatting)
→ ServerArtifactFileCreated (creates files for each artifact)
→ ServerChatMessageAppended {role: "assistant", content, timestamp}
→ ServerChatFileUpdated
→ ServerChatUpdated
```

### UI Event Flow

```
UIMessageInputFocused
→ UIMessageComposed
  - UIFileReferenced (when user types #filename)
    → UIFileReferenceAutocompleteSuggested
    → UIFileReferenceSelected (optional)
  - UIFileAttached (optional, via drag & drop or attachment button)
    → UIAttachmentPreviewDisplayed

→ UISendButtonClicked
→ UIUserMessageAppearsPending
→ ClientSubmitUserChatMessage {payload}
→ UIUserMessageConfirmed (message appears in chat)
→ UILoadingIndicatorForAIResponse

# When AI response comes in
→ UITypingIndicatorDisplayed
→ UIAIResponseStreamStarted
→ UIAIResponseChunkRendered (for each chunk of streaming response)
→ UIArtifactPlaceholderInserted (for each artifact in response)
→ UIArtifactRendered (when artifact is processed)
→ UIMessageControlsDisplayed (copy, retry buttons)
→ UIChatInputReadyForNextMessage
→ UIFileExplorerUpdated (shows new artifact files)
```

## Event 3: Open Existing Chat Flow

### User Experience

A user navigates to a previously created chat in the file explorer and clicks on it. The system loads the chat history and displays it in the main chat panel, ready for the user to continue the conversation from where they left off.

### Core Event Flow

```
# UI Interaction
UIFileNodeClicked (chat file)
→ UIFileNodeSelected

# Command and Response
→ ClientOpenFile {filePath}
→ ServerFileOpened {filePath, content, fileType}

# Chat-specific Processing
→ ServerChatInitialized {chatData}

# UI Update
→ UIChatPanelUpdated
→ ClientChatReady
```

### UI Event Flow

```
UIFileExplorerNavigated
→ UIFileNodeHovered
  - UIFileInfoTooltipDisplayed (optional)
→ UIFileNodeClicked
→ UIFileNodeSelected (highlighted in explorer)
→ UILoadingIndicatorDisplayed

# Loading and initialization
→ ClientOpenFile {filePath}
→ UIMainContentAreaCleared
→ UIChatPanelInitialized

# Content population
→ UIChatHistoryRendered
  - UIMessageThreadPopulated (user and AI messages)
  - UIArtifactLinksRendered (for any artifacts in history)
→ UIChatScrollPositionAdjusted (scrolls to bottom)
→ UIChatInputFocused
→ UILoadingIndicatorRemoved
→ UIChatReadyForInteraction
```

<!--淘汰-->

# Backend Chat Event Flows

# Backend Event Flows

## 1. Create New Chat Flow

Users click the "New Chat" button, enter an initial prompt, choose whether to create a new task, set model options, and submit. The system creates the chat and displays the chat interface.

```
ClientCreateNewChat {newTask: boolean, mode: "chat"|"agent", knowledge: string[], prompt: string, model: string}

# If creating a new task

(if newTask === true)
→ ServerTaskFolderCreated
→ ServerTaskConfigFileCreated

# Chat file creation

→ ServerChatFileCreated (under current folder)
→ ServerChatInitialized

# Chat mode processing

(if mode === "chat")
→ (Client Submit Chat Message Flow)

# Agent mode processing (not for MVP1)

(if mode === "agent")
→ ServerAgentRunInitiated
→ ServerAgentRunStarted
→ ... (omitted, not considered for MVP1)
```

## 2. Client Submit Chat Message Flow

Users type a message, optionally attach files, and send it. The system processes the message (including any file references), sends it to the AI, processes the AI response, and updates the chat.

```

ClientSubmitUserChatMessage {chat_id, message, attachments}
→ ServerUserChatMessagePostProcessed (handles #references and knowledge)
→ ServerChatMessageAppended {role: "user", content, timestamp}
→ ServerChatFileUpdated
→ ServerChatUpdated

# Chat mode AI response

(if mode === "chat")
→ ServerAIResponseRequested
→ ServerAIResponseGenerated
→ ServerAIResponsePostProcessed (handles artifacts and formatting)
→ ServerArtifactFileCreated (creates files for each artifact)
→ ServerChatMessageAppended {role: "assistant", content, timestamp}
→ ServerChatFileUpdated
→ ServerChatUpdated

# Agent mode processing (not for MVP1)

(if mode === "agent")
→ ... (omitted, not considered for MVP1)

```

- "UserChatMessage" vs "UserPrompt ?

  - 考慮到事件流的命名約定和清晰度，我的建議是採用 "UserChatMessage"，這樣可以與其他聊天訊息（如 "AssistantChatMessage"）保持一致的命名模式，同時也明確表示這是在聊天上下文中使用者發送的訊息。

- 在儲存 chat message 時，需要考慮到 #references 未來可能更動的情況，因為這會影響到事件流的 cache
  - message 依然儲存成 #reference，同時加上每個檔案的MD5
    - 在重跑時，重新確認 #reference 的 MD5，有不同的話就等於 dependency 已經更新，需要重跑（無法用 cache）
  - #reference 路徑變更：這會直接找不到檔案，存成相對路徑或許比較好？或是說當使用者做資料夾移動時，可以提醒是否要更新 #references 路徑？

## 3. Open Existing Chat Flow

Users click on a chat file in the explorer. The system loads the file, initializes the chat data, and updates the UI to display the chat content.

```

# UI Interaction

UIFileNodeClicked (chat file)
→ UIFileNodeSelected

# Command and Response

→ ClientOpenFile {filePath}
→ ServerFileOpened {filePath, content, fileType}

# Chat-specific Processing

→ ServerChatInitialized {chatData}

# UI Update

→ UIChatPanelUpdated
→ ClientChatReady

```
