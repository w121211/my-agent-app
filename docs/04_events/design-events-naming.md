# 事件命名重構方案

## UI 事件

### 用戶交互事件

- `UINewTaskButtonClicked` (原 ClientNewTaskButtonClicked)
- `UIFolderNodeClicked` (原 ClientFolderNodeClicked)
- `UIFileNodeClicked` (原 ClientFileNodeClicked)
- `UIStartTaskButtonClicked` (原 ClientStartButtonClicked)
- `UIStopTaskButtonClicked` (原 ClientStopButtonClicked)
- `UICloneSubtaskButtonClicked` (原 ClientCloneSubtaskButtonClicked)
- `UINewChatButtonClicked` (原 ClientNewChatButtonClicked)
- `UICloneChatButtonClicked` (原 ClientCloneChatButtonClicked)
- `UIBranchChatButtonClicked` (原 ClientBranchChatButtonClicked)
- `UISendMessageButtonClicked` (原 ClientSendMessageButtonClicked)
- `UIApproveWorkButtonClicked` (原 ClientApproveWorkButtonClicked)

### UI 狀態事件

- `UIFileNodeSelected` (原 ClientSetNodeSelected)
- `UIFolderNodeExpansionToggled` (原 ClientToggleNodeExpansion)
- `UIFileOpened` (原 ClientOpenFileInEditor)
- `UITaskInputModalShown` (原 ClientShowTaskInputModal)
- `UITaskInputSubmitted` (原 ClientTaskInputSubmitted)
- `UIChatInputModalShown` (原 ClientShowChatInputModal)
- `UIChatInputSubmitted` (原 ClientChatInputSubmitted)
- `UIChatFileOpened` (原 ClientOpenChatFile)
- `UIErrorNotificationShown` (原 ClientShowErrorNotification)

## Client 事件

### Client 命令

- `ClientCreateTask` (原 CLIENT_CREATE_TASK_COMMAND)
- `ClientStartTask` (原 CLIENT_START_TASK_COMMAND)
- `ClientStopTask` (原 ClientStopTaskCommand)
- `ClientStartSubtask` (原 CLIENT_START_SUBTASK_COMMAND)
- `ClientCompleteSubtask` (原 CLIENT_COMPLETE_SUBTASK_COMMAND)
- `ClientStopSubtask` (原 ClientStopSubtaskCommand)
- `ClientCloneSubtask` (原 ClientCloneSubtaskCommand)
- `ClientStartNewChat` (原 CLIENT_START_NEW_CHAT_COMMAND)
- `ClientSubmitInitialPrompt` (原 CLIENT_SUBMIT_INITIAL_PROMPT_COMMAND)
- `ClientSubmitMessage` (原 CLIENT_SUBMIT_MESSAGE_COMMAND)
- `ClientCloneChat` (原 ClientCloneChatCommand)
- `ClientBranchChat` (原 ClientBranchChatCommand)
- `ClientApproveWork` (原 CLIENT_APPROVE_WORK)
- `ClientRunTest` (原 CLIENT_TEST_EVENT)

### Client 狀態更新

- `ClientFileTreeUpdated` (原 ClientTreeUpdate)
- `ClientDirectoryAdded` (原 ClientTreeAddDirectory)
- `ClientFileAdded` (原 ClientTreeAddFile)
- `ClientEditorReloadRequested` (原 ClientEditorPromptReload)
- `ClientEditorUpdated` (原 ClientEditorUpdate)
- `ClientFileChangeIgnored` (原 ClientIgnoreFileChange)
- `ClientChatUpdated` (原 ClientChatUpdate)
- `ClientTaskUpdated` (原 ClientApplyTaskUpdate)
- `ClientUIStateUpdated` (原 ClientStateUpdate)

## Server 事件

### 任務相關

- `ServerTaskCreated` (原 SERVER_TASK_CREATED)
- `ServerTaskFolderCreated` (原 SERVER_TASK_FOLDER_CREATED)
- `ServerTaskInitialized` (原 SERVER_TASK_INITIALIZED)
- `ServerTaskLoaded` (原 SERVER_TASK_LOADED)

### 子任務相關

- `ServerSubtaskStarted` (原 SERVER_SUBTASK_STARTED)
- `ServerSubtaskCompleted` (原 SERVER_SUBTASK_COMPLETED)
- `ServerSubtaskUpdated` (原 SERVER_SUBTASK_UPDATED)
- `ServerNextSubtaskTriggered` (原 SERVER_NEXT_SUBTASK_TRIGGERED)

### 聊天相關

- `ServerChatCreated` (原 SERVER_CHAT_CREATED)
- `ServerChatFileCreated` (原 SERVER_CHAT_FILE_CREATED)
- `ServerChatContentUpdated` (原 SERVER_CHAT_UPDATED)
- `ServerAgentProcessedMessage` (原 SERVER_AGENT_PROCESSED_MESSAGE)
- `ServerAgentResponseGenerated` (原 SERVER_AGENT_RESPONSE_GENERATED)
- `ServerMessageReceived` (原 SERVER_MESSAGE_RECEIVED)
- `ServerMessageSavedToChatFile` (原 SERVER_MESSAGE_SAVED_TO_CHAT_FILE)

### 系統相關

- `ServerFileWatcherEvent` (原 SERVER_FILE_SYSTEM)
- `ServerSystemTestExecuted` (原 SERVER_TEST_EVENT)
