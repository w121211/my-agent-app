# 任務管理系統前端 UI 事件流

## 1. 任務管理 (Task Management)

### 任務創建流程
```
UserClickNewTaskButton
  → UI.ShowNewTaskChat
  → UI.FocusMessageInput
  → UserSubmitTaskDescriptionMessage
    → UI.ShowLoadingState
    → CLIENT_SUBMIT_MESSAGE_COMMAND
    → SERVER_MESSAGE_RECEIVED
    → SERVER_MESSAGE_SAVED_TO_CHAT_FILE
    → SERVER_AGENT_PROCESSED_MESSAGE
    → SERVER_AGENT_RESPONSE_GENERATED
    → UI.DisplayAIResponse(任務建議)
  → UserConfirmTaskCreation
    → UI.ShowLoadingState
    → CLIENT_CREATE_TASK_COMMAND
    → SERVER_TASK_CREATED
    → SERVER_TASK_FOLDER_CREATED
    → SERVER_TASK_INITIALIZED
    → UI.AddTaskToExplorer(自動展開)
    → UI.UpdateTaskStatus(🏃)
    → CLIENT_START_TASK_COMMAND
    → SERVER_SUBTASK_STARTED (首個子任務)
    → UI.DisplaySubtaskFolders
    → UI.NavigateToFirstSubtask
```

### 任務狀態切換流程
```
UserClickTaskStatusIcon(🏃/⏸️)
  → UI.ToggleTaskStatusIcon
  → CLIENT_TOGGLE_TASK_STATUS_COMMAND
  → SERVER_TASK_STATUS_UPDATED
  → UI.UpdateTaskStatusIndicator
  → UI.ShowStatusNotification("任務已暫停/繼續")
```

### 任務展開/折疊流程
```
UserClickTaskExpandIcon(▼/►)
  → UI.ToggleTaskFolderExpansion
  → UI.StoreExpandedState(localStorage)
```

### 任務切換流程
```
UserClickTaskItem
  → UI.HighlightSelectedTask
  → UI.LoadTaskDetails
  → UI.ExpandFirstActiveSubtask
  → UI.LoadRecentChat(如果存在)
```

## 2. 子任務管理 (Subtask Management)

### 子任務切換流程
```
UserClickSubtaskItem
  → UI.HighlightSelectedSubtask
  → UI.LoadSubtaskFiles
  → UI.LoadMostRecentChat(如果存在)
    → UserOpenChatCommand
    → ChatFileLoaded
    → ChatReady
  → UI.UpdateBreadcrumbPath
```

### 子任務完成流程
```
UserSubmitApprovalMessage("/approve" 或確認回應)
  → UI.ParseMessageForApproval
  → UI.ShowLoadingState
  → CLIENT_SUBMIT_MESSAGE_COMMAND(包含approval標記)
  → SERVER_MESSAGE_RECEIVED
  → SERVER_MESSAGE_SAVED_TO_CHAT_FILE
  → CLIENT_APPROVE_WORK
  → CLIENT_COMPLETE_SUBTASK_COMMAND
  → SERVER_SUBTASK_COMPLETED
  → UI.UpdateSubtaskStatus(✓)
  → SERVER_NEXT_SUBTASK_TRIGGERED
  → SERVER_SUBTASK_STARTED(下一子任務)
  → UI.NavigateToNextSubtask
  → UI.ShowStatusNotification("子任務已完成，進入下一階段")
  → UI.StartNewSubtaskChat(自動)
```

## 3. 聊天管理 (Chat Management)

### 創建新聊天流程
```
UserClickNewChatButton
  → UI.ShowLoadingState
  → CLIENT_START_NEW_CHAT_COMMAND
  → SERVER_CHAT_CREATED
  → SERVER_CHAT_FILE_CREATED
  → UI.AddChatToExplorer(💬)
  → UI.NavigateToChatInterface
  → UI.FocusMessageInput
  → UI.GenerateInitialPrompt(基於子任務類型)
  → UI.ShowPromptSuggestion
```

### 開啟聊天流程
```
UserClickChatItem
  → UI.HighlightSelectedChat
  → UI.ShowLoadingState
  → UserOpenChatCommand
  → ChatFileLoaded
  → UI.DisplayChatHistory
  → UI.ScrollToLatestMessage
  → UI.FocusMessageInput
  → UI.UpdateBreadcrumbPath
```

### 發送消息流程
```
UserTypeMessage
  → UI.ShowTypingIndicator
  → UI.EnableSendButton

UserClickSendButton (或按Enter)
  → UI.DisableSendButton
  → UI.AddMessageToChatUI
  → UI.ShowAITypingIndicator
  → CLIENT_SUBMIT_MESSAGE_COMMAND
  → SERVER_MESSAGE_RECEIVED
  → SERVER_MESSAGE_SAVED_TO_CHAT_FILE
  → SERVER_AGENT_PROCESSED_MESSAGE
  → SERVER_AGENT_RESPONSE_GENERATED
  → UI.DisplayAIResponse
  → UI.ScrollToLatestMessage
  → UI.FocusMessageInput
  → UI.CheckForWorkCompletion(檢查AI是否完成工作)
    → UI.ShowApprovalSuggestion(如果檢測到完成的工作)
```

### 附加檔案流程
```
UserClickAttachmentButton
  → UI.OpenFileSelector

UserSelectFile
  → UI.ShowSelectedFileName
  → UI.PreviewFile(如果可預覽)

UserDragFileToInput
  → UI.HighlightDropZone
  → UI.ShowFilePreview
  
UserSendMessageWithAttachment
  → UI.ShowUploadProgress
  → CLIENT_UPLOAD_FILE_COMMAND
  → SERVER_FILE_UPLOADED
  → CLIENT_SUBMIT_MESSAGE_COMMAND(包含檔案引用)
  → SERVER_MESSAGE_RECEIVED
  → SERVER_MESSAGE_SAVED_TO_CHAT_FILE
  → UI.DisplayMessageWithAttachment
  → SERVER_AGENT_PROCESSED_MESSAGE
  → SERVER_AGENT_RESPONSE_GENERATED
  → UI.DisplayAIResponse
```

## 4. 檔案管理 (File Management)

### 查看檔案流程
```
UserClickFileItem
  → UI.HighlightSelectedFile
  → UI.ShowLoadingState
  → UI.LoadFileContent
  → UI.DisplayFilePreview
  → UI.ShowFileActions(下載、分享等)
  → UI.UpdateBreadcrumbPath
```

### 下載檔案流程
```
UserClickDownloadButton
  → UI.InitiateFileDownload
  → UI.ShowDownloadProgress
  → UI.ShowDownloadComplete
```

### 與AI討論檔案流程
```
UserMentionFileInChat
  → UI.HighlightMentionedFile
  → CLIENT_SUBMIT_MESSAGE_COMMAND(包含檔案引用)
  → SERVER_MESSAGE_RECEIVED
  → SERVER_MESSAGE_SAVED_TO_CHAT_FILE
  → SERVER_AGENT_PROCESSED_MESSAGE(讀取檔案)
  → SERVER_AGENT_RESPONSE_GENERATED
  → UI.DisplayAIResponse(包含檔案分析)
```

## 5. 使用者介面控制

### 調整面板大小流程
```
UserDragPanelDivider
  → UI.ResizePanel
  → UI.StoreLayoutPreference
  → UI.AdaptContentToNewSize
```

### 切換視圖模式流程
```
UserClickViewModeButton
  → UI.ToggleViewMode
  → UI.StoreViewPreference
  → UI.UpdateExplorerDisplay
```

## 6. 系統狀態通知

### 操作完成通知流程
```
AnySuccessfulOperation
  → UI.ShowSuccessNotification(2秒後自動消失)
```

### 錯誤通知流程
```
AnyFailedOperation
  → UI.ShowErrorNotification
  → UI.LogErrorDetails
  → UI.OfferRetryOption(如適用)
```

### 任務進度指示流程
```
TaskProgressChanged
  → UI.UpdateTaskProgressIndicator
  → UI.UpdateTaskStatusIcon
  → UI.ShowProgressNotification(如需要)
```