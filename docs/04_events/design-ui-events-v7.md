# Event Flow Design for UI

Based on the provided information, here's the redesigned UI event flow:

# File System Events

1. File Added Flow:

```
ServerFileSystem (add)
  → ClientTreeUpdate
```

2. Directory Added Flow:

```
ServerFileSystem (addDir)
  → ClientTreeUpdate
```

3. File Removed Flow:

```
ServerFileSystem (unlink)
  → ClientTreeUpdate
  → (If file is open) ClientEditorPromptReload
```

4. Directory Removed Flow:

```
ServerFileSystem (unlinkDir)
  → ClientTreeUpdate
```

5. File Changed Flow:

```
ServerFileSystem (change)
  → (If file is open)
    → (If not chat file) ClientEditorPromptReload
    → (If chat file and AI response) ClientEditorUpdate
```

# Task Events

1. Task Created Flow:

```
ServerTaskCreated
  → ClientTreeAddDirectory
```

2. Task Updated Flow:

```
ServerTaskUpdated
  → ClientTreeUpdate
```

# Subtask Events

1. Subtask Created Flow:

```
ServerSubtaskStarted
  → ClientTreeAddDirectory
```

2. Subtask Status Changed Flow:

```
ServerSubtaskUpdated
  → ClientTreeUpdate
```

3. Subtask Lifecycle Flow:

```
ServerSubtaskStarted/ServerSubtaskCompleted
  → ClientShowNotification
```

# Chat Events

1. Chat Created Flow:

```
ServerChatCreated
  → ServerChatFileCreated
  → ClientTreeAddFile
```

2. Human Message Submitted Flow:

```
ClientSubmitMessageCommand
  → (Client state already updated)
  → ServerMessageReceived
  → ServerMessageSavedToChatFile
  → (If matching ID already processed) ClientIgnoreFileChange
```

3. AI Message Received Flow:

```
ServerAgentResponseGenerated
  → (If chat open) ClientChatUpdate
  → ServerMessageSavedToChatFile
  → (If matching ID already processed) ClientIgnoreFileChange
```

4. Chat Error Flow:

```
ServerChatError
  → ClientShowErrorNotification
```

# UI User Interactions

1. Folder Node Click Flow:

```
ClientFolderNodeClicked
  → ClientSetNodeSelected
  → ClientToggleNodeExpansion
```

2. File Node Click Flow:

```
ClientFileNodeClicked
  → ClientSetNodeSelected
  → ClientOpenFileInEditor
```

3. Start Task/Subtask Button Flow:

```
ClientStartButtonClicked
  → ClientStartTaskCommand / ClientStartSubtaskCommand
  → ServerTaskUpdated / ServerSubtaskUpdated
  → ClientApplyTaskUpdate
```

4. Stop Task/Subtask Button Flow:

```
ClientStopButtonClicked
  → ClientStopTaskCommand / ClientStopSubtaskCommand
  → ServerTaskUpdated / ServerSubtaskUpdated
  → ClientApplyTaskUpdate
```

5. New Task Button Flow:

```
ClientNewTaskButtonClicked
  → ClientShowTaskInputModal
  → ClientTaskInputSubmitted
    → ClientCreateTaskCommand
    → ServerTaskCreated
    → ServerTaskFolderCreated
    → ClientTreeUpdate
    → ServerSubtaskStarted
    → ClientTreeUpdate
    → ServerChatCreated
    → ServerChatFileCreated
    → ClientTreeUpdate
    → ClientOpenChatFile
```

6. Clone Subtask Button Flow:

```
ClientCloneSubtaskButtonClicked
  → ClientCloneSubtaskCommand
  → ServerFileSystem (multiple events)
  → ClientTreeUpdate
```

7. New Chat Button Flow:

```
ClientNewChatButtonClicked
  → ClientShowChatInputModal
  → ClientChatInputSubmitted
    → ClientStartNewChatCommand
    → ServerChatCreated
    → ServerChatFileCreated
    → ClientTreeUpdate
    → ClientOpenChatFile
```

8. Clone/Branch Chat Flow:

```
ClientCloneChatButtonClicked / ClientBranchChatButtonClicked
  → ClientCloneChatCommand / ClientBranchChatCommand
  → ServerChatCreated
  → ServerChatFileCreated
  → ClientTreeUpdate
  → ClientOpenChatFile
```

9. Send Chat Message Flow:

```
ClientSendMessageButtonClicked
  → ClientSubmitMessageCommand
  → ServerMessageReceived
  → ServerAgentProcessedMessage
  → ServerAgentResponseGenerated
  → ClientChatUpdate
```

10. Approve Work Flow:

```
ClientApproveWorkButtonClicked
  → ClientApproveWork
  → ClientCompleteSubtaskCommand
  → ServerSubtaskCompleted
  → ServerNextSubtaskTriggered
  → ClientStateUpdate
```
