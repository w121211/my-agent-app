# Event Flows for Chat

## 1. Create New Chat Flow

### User Story

A user wants to start a new conversation with the AI. They click the "New Chat" button, configure their chat settings including whether to create a new task, select their model preference, and input their initial prompt. After submission, a new chat interface appears ready for interaction.

### Core Event Flow

```
# User Interaction
UINewChatButtonClicked

ClientCreateNewChat {newTask: boolean, mode: "chat"|"agent", knowledge: string[], prompt: string, model: string}

(if newTask === true)
  → ServerTaskFolderCreated
  → ServerTaskConfigFileCreated

# Chat file creation
→ ServerChatFileCreated (under current folder or the newly created task folder)
→ ServerChatInitialized

# Creation Completed
→ ServerNewChatCreated {filePath: newChatPath, chatId: newChatId}
→ UIFileAutoClicked {filePath: newChatPath}   # UI 自動點選新創的chat file，後續就跟一般的open chat file一樣
  → ClientOpenFile {filePath: newChatPath}
  (continues to Open Existing Chat Flow)

# Chat mode processing
(if mode === "chat")
→ (Client Submit Chat Message Flow)

# Agent mode processing (not for MVP1)
(if mode === "agent")
→ ServerAgentRunInitiated
→ ServerAgentRunStarted
→ ... (omitted, not considered for MVP1)
```

## 2. Submit Chat Message Flow

### User Story

A user in an active chat composes a message, potentially references files using the `#file` syntax, attaches documents if needed, and sends their message. They see their message appear in the chat, along with a loading indicator while the AI processes the response. The AI's response with any artifacts is then displayed.

### Core Event Flow

```
# User Interface
UIChatMessageSubmitted {message, attachments}

# Client Command
→ ClientSubmitUserChatMessage {chat_id, message, attachments}

# Server Processing - User Message
→ ServerUserChatMessagePostProcessed (handles #references and knowledge)
→ ServerChatMessageAppended {role: "user", content, timestamp}
→ ServerChatFileUpdated
→ UIChatMessagesUpdated (shows user message)

# Server Processing - AI Response
→ ServerAIResponseRequested
→ UIChatResponseLoadingStarted
→ ServerAIResponseGenerated
→ ServerAIResponsePostProcessed (handles artifacts and formatting)

# Artifact Creation (if needed)
→ ServerArtifactFileCreated (creates files for each artifact)
→ UIPreviewPanelUpdated (shows artifact)

# Chat Update
→ ServerChatMessageAppended {role: "assistant", content, timestamp}
→ UIChatMessagesUpdated (shows AI response)
→ UIChatResponseLoadingEnded
→ ServerChatFileUpdated
```

## 3. Open File Flow

### User Story

A user navigates to any file in the explorer and clicks on it. The system loads the file content and displays it in the appropriate panel based on the file type.

### Core Event Flow

```
UIFileClicked

# Command and Response
→ ClientOpenFile {filePath}
→ ServerFileOpened {filePath, content, fileType}

# Frontend Parsing (internal, no event)
→ (Frontend parses content based on fileType)

# UI Update
→ UIChatPanelUpdated (for chat files)
  or
→ UIPreviewPanelUpdated (for other files)
```

---

# 備註

### "UserChatMessage" vs "UserPrompt ?

- 考慮到事件流的命名約定和清晰度，我的建議是採用 "UserChatMessage"，這樣可以與其他聊天訊息（如 "AssistantChatMessage"）保持一致的命名模式，同時也明確表示這是在聊天上下文中使用者發送的訊息。

### 在儲存 chat message 時，需要考慮到 #references 未來可能更動的情況，因為這會影響到事件流的 cache

- message 依然儲存成 #reference，同時加上每個檔案的MD5
  - 在重跑時，重新確認 #reference 的 MD5，有不同的話就等於 dependency 已經更新，需要重跑（無法用 cache）
- #reference 路徑變更：這會直接找不到檔案，存成相對路徑或許比較好？或是說當使用者做資料夾移動時，可以提醒是否要更新 #references 路徑？

### ServerChatFileUpdated 這個 event 可以如何應用？是純粹忽略？還是可以用於比較是否與當前的chat有所差異？

1. **Save Confirmation**

   - Show a subtle "Saved" indicator in the UI
   - This provides users confidence their work is being preserved
   - Example: Small checkmark or "Changes saved" text that appears briefly

2. **Conflict Detection**

   - Compare file timestamp/version with client's current state
   - Alert users if the file was modified elsewhere (e.g., another device)
   - This prevents data loss in collaborative scenarios

3. **Offline/Sync Status**

   - Track which chats have been successfully persisted
   - Important for implementing offline capabilities later

4. **Enable/Disable Actions**
   - Enable actions that require saved state (sharing, exporting)
   - Example: The "Share" button becomes active only after `ServerChatFileUpdated`

---

<!--  以下為 AI 生成，沒有檢視確認過，先忽略 -->

## 4. Stop AI Response Generation Flow

```

ClientStopAIGenerationRequested {chat_id}
→ ServerAIGenerationCancelled
→ ServerChatMessageAppended {role: "system", content: "AI response generation stopped"}

```

## 5. Edit Previous Prompt Flow (Chat Versioning)

```

ClientEditExistingPromptRequested {chat_id, message_id, new_content}
→ ServerChatBranchingInitiated
→ ServerNewChatVersionCreated {version: current_version + 1}
→ ServerChatFileCreated (with version suffix)
→ ServerChatHistoryCopied (up to edited message)
→ ServerEditedMessageAppended {role: "user", content: new_content}
→ (Standard AI response generation flow)

```

## 6. Summarize Chat Flow

```

ClientSummarizeRequested {chat_id}
→ ServerSummarizePromptGenerated
→ ServerAIResponseGenerationRequested {summarize_prompt, model}
→ ServerSummaryProcessed
→ ServerSummaryArtifactCreated {filename: "chat_summary.v1.md"}
→ ServerChatMessageAppended {role: "system", content: "Summary saved as: chat_summary.v1.md"}

```

## 7. Next Step Feature Flow

```

ClientNextStepRequested {chat_id, current_task_id}
→ ServerTaskStateAnalyzed
→ ServerNextStepPromptGenerated
→ ServerAIResponseGenerationRequested {next_step_prompt, model}
→ ServerNextStepSuggestionsExtracted
→ ServerNextStepSuggestionsReturned {suggestions: [...]}
→ ClientNextStepOptionSelected {option_index, modified_prompt}
→ (Create New Chat Flow or Continue in Current Chat)

```

## 8. Error Handling Flow

```

ServerChatError {chat_id, error_type, error_message}
→ ClientChatErrorReceived

```

## 3. Summarize Feature Flow

```

ClientSummarizeRequested {chat_id}
→ ServerSummarizeReceived
→ ServerSummarizePromptGenerated
→ ServerAIResponseGenerationRequested {chat_id, summarize_prompt, model}
→ ServerAIResponseGenerationCompleted
→ ServerSummaryProcessed
→ ServerSummaryArtifactCreated {filename: "chat_summary.v1.md"}
→ ServerChatMessageAppended {role: "system", content: "Summary saved as: chat_summary.v1.md", timestamp}

```

## 4. Next Step Feature Flow

```

ClientNextStepRequested {chat_id, current_task_id}
→ ServerNextStepReceived
→ ServerTaskStateAnalyzed
→ ServerNextStepPromptGenerated
→ ServerAIResponseGenerationRequested {chat_id, next_step_prompt, model}
→ ServerAIResponseGenerationCompleted
→ ServerNextStepSuggestionsExtracted
→ ServerNextStepModalDataPrepared {
suggestions: [
{title: "Suggestion 1", prompt: "...", createNewTask: boolean},
{title: "Suggestion 2", prompt: "...", createNewTask: boolean},
{title: "Suggestion 3", prompt: "...", createNewTask: boolean}
],
default_knowledge: string[],
default_instructions: string
}
→ ClientNextStepOptionSelected {option_index, modified_prompt, modified_knowledge}
→ ServerNextStepExecutionStarted

(if createNewTask === true)
→ ServerTaskFolderCreated
→ ServerTaskConfigFileCreated
→ ServerChatFileCreated (under new task folder)
→ ServerChatObjectInitialized

(if createNewTask === false)
→ ServerChatFileCreated (under current task folder)
→ ServerChatObjectInitialized

→ ServerNextStepExecutionCompleted
→ (Continues with standard new chat flow)

```

## 5. Chat Versioning Flow

```

ClientPromptEditRequested {chat_id, message_id, new_content}
→ ServerPromptEditReceived
→ ServerChatBranchingInitiated
→ ServerNewChatVersionCreated {version: current_version + 1}
→ ServerChatFileCreated (with version suffix)
→ ServerChatHistoryCopied (up to edited message)
→ ServerEditedMessageAppended {role: "user", content: new_content, timestamp}
→ (Continues with standard new chat flow)

```

---

# Key Design Principles for Event Flow

1. **Command-driven approach**: Using `ClientOpenFile` as a command rather than a request creates a cleaner event pattern that aligns with the rest of the system.

2. **Event reduction**: Simplifying the flow by eliminating redundant events (like separate request/response pairs) makes the system more maintainable.

3. **Clear state transitions**: Each event represents a distinct state change in the system, making the flow easy to reason about.

4. **Separation of concerns**:

   - Generic file operations (`ClientOpenFile`, `ServerFileOpened`)
   - Application-specific processing (`ServerChatInitialized`)
   - UI updates (`UIChatPanelUpdated`)

5. **Consistent naming conventions**: Following established patterns in the codebase improves readability and reduces cognitive load.

6. **Progressive processing**: The flow moves logically from user interaction → command → server processing → client update.

7. **Composable events**: The design allows for reuse of the file opening sequence for different file types, with type-specific processing added as needed.

8. **Preservation of intent**: The event names clearly communicate what is happening at each step without implementation details.

## Two-Layer Structure (User Story + Event Flow)

```
┌─────────────────────────────────────────┐
│           User Story                    │
│ Describes what the user wants to achieve│
│ and the expected outcome                │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│           Event Flow                    │
│ Sequence of technical events across     │
│ UI, Client, and Server                  │
└─────────────────────────────────────────┘
```

## 建議的精簡事件命名約定

保留UI/Client/Server前綴，但確保事件名稱本身包含足夠的業務語義：

- `UICreateTaskButtonClicked` → 用戶界面事件
- `ClientTaskCreationRequested` → 前端業務邏輯請求
- `ServerTaskCreated` → 後端處理結果，已包含業務狀態變化

---

<!--  以下為原稿，請勿刪除 -->

# Event flow design

## 寫在前面

- 為了簡單表達event，我用比較自然直覺的寫法，也省略了 server 等
- 我只是大略的列了一些，沒有涵蓋到全部的功能、情況，每個事件流中也有缺漏、或是錯誤的地方
- subfolder 概念已經廢除

**app特定概念的用詞說明**

- Workspace, root folder：是project的入口，原則上不能作為task folder，只能在底下新增tasks
- Task folder，任務資料夾: folder裡有 task.json，可以有sub task folder，利如 workspace/task1/task1, task2, …
- Non-task folder，非任務資料夾：非task folder，也不是 workspace

**大部分功能都是以 new chat 作為起點**

- 沒有 new task

**建立 new chat 時**

1. 指定的 folder 有 task.json file (as task folder) -> 建立新 chat，不建議 with task
2. 指定的 folder沒有 task.json （非 task folder），使用者可能是想1. 建立 pure chat 2. 將此 folder 當成 task folder => MVP 階段，先不考慮此，都優先是給 pure chat，task 選項留給使用者自己勾選

**建立 new chat 時，當勾選 new task 時，會有兩種可能需求**

1. 把此 folder 轉成 task folder （只適用於非 /workspace, 非 task folder）
2. 在此 folder 下新建一個 task folder，新 task folder 按編號命名為 task1, task2, …

=> MVP階段，只考慮新建，不考慮轉成 task folder，但可以考慮遇到non-task folder時，自動把裡面的檔案（不包括sub folders）加入至task knowledge中（如果不需要，使用者可以自行移除）

**一點思考**

- chat 的含義？

### New chat

**New chat modal**

```

ui user click new chat button
->pre fill new chat modal info
-> analyze selected folder
-> is root folder, task folder, or non-task folder
-> set new task flag on/off
-> (if is non-task folder) add non-task folder’s files into knowledge
…
-> show new chat modal
…
-> user submit new chat

```

**Start new chat**

```

client start new chat {new task on/off, chat/agent mode, knowledge, prompt, …}
-> server new chat request received
-> ...

(if new task on)
-> create new task folder and task config file
-> create chat file (under new task folder)
-> init chat object (including chat mode)
-> append chat message (add the new chat’s prompt as first prompt)
-> update chat file

(if new task off)
-> create chat file (under current folder)
-> init chat object (including chat mode)
-> append chat message (add the new chat’s prompt as first prompt)
-> update chat file

(if chat mode)
-> step the chat start (?)
-> call ai to generate response (or generate text)
-> (UI can then update chat panel)
-> receive ai generated response
-> append chat message
-> update chat file
-> step the chat - finish (?)
-> server response

(If agent mode)
-> start agent mode run
-> ...

```

**Run agent mode**

```

start run agent mode
-> agent start plan (review current state, plan, action, in one step or in multiple steps => 我不確定現在主流做法是怎樣) -> ai start generate text -> ai generated text
-> agent plan generated
-> append to chat message -> chat file updated
-> agent action: use tool, ai plan, ask user (for more info, for work review, ...), task done

(if action: use tool)
-> system run tool start
-> system run tool result
-> append to chat message -> chat file updated
-> agent start plan step

(if action: ask user for more information)
->

(if action: ask user for work review)
->

(if action: plan)
->

```

## 其他的一些功能（非完整全面）

我會簡單給一些重點，但不完整全面

### Prompt input box

Inject file through '#'

- 需要請求後端搜尋檔案，或是其實可以直接用前端的 workspace tree 完成？
- fuzzy search，尋找類似的檔名

Prompt auto complete

- MVP 階段不考慮

Insert files

- 用拖曳，或是透過介面
- 如果是直接在 workspace 裡的 file 可直接注入
- 外部的檔案？可能需要有權限？ 也需要 copy 到 task folder
- 如果是使用者直接拖曳 files 到 worksapce explorer 的 task folder 裡？ => MVP不考慮

Insert URL

- MVP不考慮

### In a chat

User submit prompt

User edit previous prompt & submit

Artifact

Stop AI generating response

Ask AI to retry response

- 會據此分支（branch） ＆ 新創一個 chat file，然後以此 chat file 去做 ai retry

Summarize chat

- 這個就直接想像成使用預設的prompt template好了，點擊後就 -> chat message 新增一個user prompt，例如 "please summarize thread and output as ..." -> 執行

Next step

- 可以想像成其實就是開一個新 chat，執行 template prompt，context 注入目前的 task state，叫 AI 基於當前的 state 建議下一步
- 把ai的建議放在next step modal，給 user 選擇、修改
- 可以建議是新增 chat、還是新增 task，但如果要簡單一點，就全部建議成新增task（？）

### Workspace, workflow

Start/stop run task

- 就是按照設定好的workflow逐一跑 tasks, chat, ...
- 反正有cache，在不修改的前提下從零開始跑也很快，就不另外考慮 pause/resume 機制

Start/stop run chat

- 要考慮 cache
- 如果某個節點（chat message）有所變動，從那個節點分支，重跑之後的部分

Clone task folder, chat file

- MVP不考慮
- 就直接使用一般的 copy/paste 不就好了？
- 我唯一想到的是這可能就只是會影響到workspace, dashboard 多了一個 task，但好像實質上也沒啥關係，反正使用者想要這樣做就讓他這樣做

資料夾、檔案路徑變更

- MVP不考慮
- 要考慮到依賴這個檔案的chats, tasks => 是否要自動幫這些 chats 更新路徑，待決定
- 在 vscode 上，修改檔名會提示是否要更新 import，但不會主動幫忙更新

```

```

```

```

```

```

```

```
