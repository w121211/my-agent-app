# Event Flows for Chat (MVP)

# Add/Remove Workspace Folder Event Flow

## 1. Add Workspace Flow

### User Story

A user wants to add a local folder as a workspace to the application. They click a dedicated "Add Workspace" button, navigate to and select the desired folder using the system's file picker, and confirm their selection. The folder is then added to the workspace list, making its contents available for AI-assisted tasks.

<!--
  - 用指定的 folder name 當 workspace name
  - 如果碰到兩個相同的 folder-name，後來者就自動加上後贅詞 "<folder_name>-1" "<folder_name>-2"
  - 若該 folder 已經是當前 workspaces 中的某個子資料夾，則不再加入，ui 就直接打開該 folder
  - （未來）使用者可直接將 folder 拖至 app explore 後就加入（不做詢問，因為移除是很簡單的步驟）
  - UI 沿用目前的 workspace tree node 的做法，每個 node 都有一個 options button， workspace 也視為一個 folder node，點擊 options 按鈕，開啟 options panel，點擊刪除button 後刪除（類似 notion 的做法，請參考notion的圖）
  - 現階段（ＭＶＰ）可以 naive 一點，就直接用 settings page 上去新增/移除 workspace

-->

### Core Event Flow

```
# User Interaction
UIAddWorkspaceButtonClicked

# System File Picker
→ UISystemFilePickerOpened
→ UISystemFolderSelected {folderPath}

# Client Command

<!-- 我想要盡可能減少事件種類，可能直接用 client update user settings {kind: "WORKSPACE_ADDED", workspacePath} 比較適合？ -->
→ ClientAddWorkspace {folderPath}


# Server Processing
  # Checks if folder exists and is accessible
  # Verifies it's not already added as a workspace
→ ServerWorkspaceValidated {folderPath, isValid, validationMessage}

(if isValid === true)

  <!-- file watcher 需要增加這個 workspace -->

  → ServerWorkspaceAdded {workspaceId, folderPath, workspaceName}

  <!--  直接用 user settings updated，例如 setttings.json，workspace config 是裡面的一個 -->
  → ServerWorkspaceConfigUpdated

  → UIWorkspaceExplorerUpdated {workspaces}

  <!-- 前端用這個 event 來取得初始的 workspace tree -->
  → ClientRequestWorkspaceFolderTree

  → UIWorkspaceSelected {workspacePath}

(else)
  → UIWorkspaceValidationError {validationMessage}
```

## 2. Remove Workspace Flow

### User Story

A user wants to remove a workspace from the application without deleting the actual folder from their file system. They select a workspace from the workspace list, click a "Remove" option (via context menu or dedicated button), confirm their intention in a confirmation dialog, and the workspace is removed from the application.

### Core Event Flow

```
# User Interaction
<!-- 需要調整 -->
UIWorkspaceContextMenuOpened {workspaceId}
UIRemoveWorkspaceOptionSelected {workspaceId}

→ UIConfirmationDialogShown
→ UIConfirmationDialogConfirmed

# Client Command
→ ClientRemoveWorkspace {workspaceId}

# Server Processing
→ ServerWorkspaceRemoved {workspaceId}
→ ServerWorkspaceConfigUpdated
→ ServerMemoryCacheCleared {workspaceId}
  # Clear any in-memory objects related to this workspace

# UI Update
→ UIWorkspaceExplorerUpdated {workspaces}
  # Updates the workspace list, removing the deleted workspace
(if current workspace was removed)
  → UIWorkspaceSelected {newWorkspaceId}
    # Selects another workspace if available, otherwise shows empty state
```

---

<!-- 以下事件流已經實裝，參考用 -->

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

# In-memory Chat Object Creation (Object-First approach)
→ ServerChatCreated {chatObject} # New event: creates chat in memory first
→ ServerChatFileCreated (async operation, doesn't block UI)

# Creation Completed - Return chat object, not just file path
→ ServerNewChatCreated {chatId: newChatId, chatObject: chat} # Modified: returns full chat object
→ UIFileAutoClicked {filePath: newChatPath}
  → ClientOpenChatFile {filePath: newChatPath} # Changed to chat-specific event

# Chat Panel Update
→ UIChatPanelUpdated {chatObject} # UI updates based on chat object, not file

# Chat mode processing
(if mode === "chat" && prompt exists)
→ (Client Submit Chat Message Flow) # Continue to message submission if prompt exists
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

# Server Processing - Memory First
→ ServerUserChatMessagePostProcessed (handles #references and knowledge)
→ ServerChatMessageAppended {role: "user", content, timestamp}
→ ServerChatUpdated {chatObject, update: {kind: "MESSAGE_ADDED", message: message}} # More structured update format
→ UIChatMessagesUpdated # UI updates immediately based on chat object

# Asynchronous File Operations (happens in background)
→ ServerChatFileUpdated # Happens after file write completes, UI doesn't wait for this

# Server Processing - AI Response
→ ServerAIResponseRequested
→ UIChatResponseLoadingStarted
→ ServerAIResponseGenerated
→ ServerAIResponsePostProcessed (handles artifacts and formatting)

# Artifact Creation (if needed)
→ ServerArtifactFileCreated (creates files for each artifact) # File system operation, UI doesn't wait for this
→ ServerChatUpdated {chatObject, update: {kind: "ARTIFACT_ADDED", artifact}} # UI updates based on this event
→ UIPreviewPanelUpdated (shows artifact) # UI responds to ServerChatUpdated, not ServerArtifactFileCreated

# Chat Update
→ ServerChatUpdated {chatObject, update: {kind: "MESSAGE_ADDED", message: aiMessage}}
→ UIChatMessagesUpdated
→ UIChatResponseLoadingEnded

# Asynchronous File Operations (happens in background)
→ ServerChatFileUpdated
```

## 3. Open File Flow

### User Story

A user clicks on a file in the explorer. The system detects the file type, loads the appropriate content, and displays it in either the chat panel (for chat files) or the preview panel (for non-chat files).

### Core Event Flow

```
UIFileClicked

# Generic File Open Command
→ ClientOpenFile {filePath, correlationId}

# Server determines file type based on extension, metadata, or content
→ ServerFileTypeDetected {filePath, fileType} # Determines if it's a chat file or content file

# Branch based on file type
(if fileType === "chat")
  # Memory Cache Check for Chat Files
  (if chat exists in memory)
    → ServerChatFileOpened {filePath, chat, correlationId}
  (else)
    → ServerChatFileLoaded {filePath}
    → ServerChatFileOpened {filePath, chat, correlationId}

  # UI Update for Chat Files - based on ServerChatFileOpened
  → UIChatPanelUpdated

(else) # Non-chat file
  # Non-chat File Processing
  → ServerNonChatFileOpened {filePath, content, fileType, correlationId}

  # UI Update for Non-chat Files
  → UIPreviewPanelUpdated {content, fileType} # Updates preview panel based on file type
```
