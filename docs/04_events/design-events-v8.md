# Redesigned Event Flow Documentation

## Task Flows

### 1. Creating a New Task

```
ClientCreateTask
  → ServerTaskCreated
  → ServerTaskFolderCreated
  → ServerTaskInitialized
  → ClientStartTask (automatically executed)
```

### 2. Executing/Resuming a Task

```
ClientStartTask
  → ServerTaskLoaded (loads from task folder)
  → ServerTaskInitialized (or task resumed)
  → ClientStartSubtask
```

## Subtask Flows

### 1. Executing a Subtask

```
ClientStartSubtask

  (Subtask service)
  (If subtask has not been executed before, no subtask folder exists)
  → ServerSubtaskInitialized
  → ServerSubtaskFolderCreated

  (If subtask folder exists)
  → ServerSubtaskFolderLoaded
  → ServerSubtaskInitialized

  → ClientStartNewChat
```

### 2. Completing a Subtask (requiring approval)

```
ClientSubmitMessage
  → ServerMessageReceived
  → ServerMessageSavedToChatFile
  → ServerChatContentUpdated
  → ClientApproveWork (approval included in user message)

ClientApproveWork
  → ClientCompleteSubtask

ClientCompleteSubtask
→ ServerSubtaskOutputGenerated
  (SubtaskService)
  → ServerSubtaskCompleted
  → ServerNextSubtaskTriggered
    (task service: get next subtask, emit ClientStartSubtask)
    → ClientStartSubtask (triggers the flow for the next subtask)
```

Notes:

- ServerNextSubtaskTriggered is used when the next subtask is automatically triggered and will definitely execute
- If the user rejects the agent's results, they simply send a message indicating what needs modification (not approving), continuing the chat

### 3. Completing a Subtask (without approval)

```
ServerSubtaskOutputGenerated
→ ServerSubtaskCompleted
→ ServerNextSubtaskTriggered
    → ClientStartSubtask
```

## Chat Flows

### 1. Starting a New Chat

```
ClientStartNewChat
→ ServerChatFileCreated
→ ServerChatCreated (including initialization)
→ ServerAgentInitialized (according to subtask settings)
→ ServerFirstPromptInitialized (automatically generates first prompt based on subtask settings and input)
→ ClientSubmitInitialPrompt
  → ServerMessageSavedToChatFile
  → ServerChatContentUpdated
  → ServerAgentProcessedMessage
  → ServerAgentResponseGenerated
  → ServerMessageSavedToChatFile
  → ServerChatContentUpdated
```

### 2. Opening an Existing Chat

Note: No need to consider leaving the original chat since chats are saved in real-time

```
UIOpenChat
→ ServerChatFileLoaded
→ ClientChatReady
```

### 3. Submitting a Message

```
ClientSubmitMessage
→ ServerMessageReceived
→ ServerMessageSavedToChatFile
→ ServerChatContentUpdated
(if user approved the work)
→ ClientApproveWork
(if not, continue)
→ ServerAgentProcessedMessage
→ ServerAgentResponseGenerated
→ ServerMessageSavedToChatFile
→ ServerChatContentUpdated
```

When the user approves work:

```
ClientApproveWork
→ ClientCompleteSubtask
```

## UI Event Flows

### File System Events

#### 1. File Added Flow

```
ServerFileWatcherEvent (add)
  → ClientFileTreeUpdated
```

#### 2. Directory Added Flow

```
ServerFileWatcherEvent (addDir)
  → ClientFileTreeUpdated
```

#### 3. File Removed Flow

```
ServerFileWatcherEvent (unlink)
  → ClientFileTreeUpdated
  → (If file is open) ClientEditorReloadRequested
```

#### 4. Directory Removed Flow

```
ServerFileWatcherEvent (unlinkDir)
  → ClientFileTreeUpdated
```

#### 5. File Changed Flow

```
ServerFileWatcherEvent (change)
  → (If file is open)
    → (If not chat file) ClientEditorReloadRequested
    → (If chat file and AI response) ClientEditorUpdated
```

### Task Events

#### 1. Task Created Flow

```
ServerTaskCreated
  → ClientDirectoryAdded
```

#### 2. Task Updated Flow

```
ServerTaskUpdated
  → ClientFileTreeUpdated
```

### Subtask Events

#### 1. Subtask Created Flow

```
ServerSubtaskStarted
  → ClientDirectoryAdded
```

#### 2. Subtask Status Changed Flow

```
ServerSubtaskUpdated
  → ClientFileTreeUpdated
```

#### 3. Subtask Lifecycle Flow

```
ServerSubtaskStarted/ServerSubtaskCompleted
  → UINotificationShown
```

### Chat Events

#### 1. Chat Created Flow

```
ServerChatCreated
  → ServerChatFileCreated
  → ClientFileAdded
```

#### 2. Human Message Submitted Flow

```
ClientSubmitMessage
  → (Client state already updated)
  → ServerMessageReceived
  → ServerMessageSavedToChatFile
  → (If matching ID already processed) ClientFileChangeIgnored
```

#### 3. AI Message Received Flow

```
ServerAgentResponseGenerated
  → (If chat open) ClientChatUpdated
  → ServerMessageSavedToChatFile
  → (If matching ID already processed) ClientFileChangeIgnored
```

#### 4. Chat Error Flow

```
ServerChatError
  → UIErrorNotificationShown
```

### UI User Interactions

#### 1. Folder Node Click Flow

```
UIFolderNodeClicked
  → UIFileNodeSelected
  → UIFolderNodeExpansionToggled
```

#### 2. File Node Click Flow

```
UIFileNodeClicked
  → UIFileNodeSelected
  → UIFileOpened
```

#### 3. Start Task/Subtask Button Flow

```
UIStartTaskButtonClicked
  → ClientStartTask / ClientStartSubtask
  → ServerTaskUpdated / ServerSubtaskUpdated
  → ClientTaskUpdated
```

#### 4. Stop Task/Subtask Button Flow

```
UIStopTaskButtonClicked
  → ClientStopTask / ClientStopSubtask
  → ServerTaskUpdated / ServerSubtaskUpdated
  → ClientTaskUpdated
```

#### 5. New Task Button Flow

```
UINewTaskButtonClicked
  → UITaskInputModalShown
  → UITaskInputSubmitted
    → ClientCreateTask
    → ServerTaskCreated
    → ServerTaskFolderCreated
    → ClientFileTreeUpdated
    → ServerSubtaskStarted
    → ClientFileTreeUpdated
    → ServerChatCreated
    → ServerChatFileCreated
    → ClientFileTreeUpdated
    → UIChatFileOpened
```

#### 6. Clone Subtask Button Flow

```
UICloneSubtaskButtonClicked
  → ClientCloneSubtask
  → ServerFileWatcherEvent (multiple events)
  → ClientFileTreeUpdated
```

#### 7. New Chat Button Flow

```
UINewChatButtonClicked
  → UIChatInputModalShown
  → UIChatInputSubmitted
    → ClientStartNewChat
    → ServerChatCreated
    → ServerChatFileCreated
    → ClientFileTreeUpdated
    → UIChatFileOpened
```

#### 8. Clone/Branch Chat Flow

```
UICloneChatButtonClicked / UIBranchChatButtonClicked
  → ClientCloneChat / ClientBranchChat
  → ServerChatCreated
  → ServerChatFileCreated
  → ClientFileTreeUpdated
  → UIChatFileOpened
```

#### 9. Send Chat Message Flow

```
UISendMessageButtonClicked
  → ClientSubmitMessage
  → ServerMessageReceived
  → ServerAgentProcessedMessage
  → ServerAgentResponseGenerated
  → ClientChatUpdated
```

#### 10. Approve Work Flow

```
UIApproveWorkButtonClicked
  → ClientApproveWork
  → ClientCompleteSubtask
  → ServerSubtaskCompleted
  → ServerNextSubtaskTriggered
  → ClientUIStateUpdated
```
