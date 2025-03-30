# AI Chat Editor Architecture Design

## System Overview

Desktop application for AI chat and file editing:

- Frontend: Next.js
- Backend: Python server with event-driven architecture
- Local deployment: Both frontend and backend run on user's machine
- Main features: Workspace management, file editing, AI chat, agent execution

## Events Flow

### Desktop app 初始啟動的事件流程

```
# Desktop app 初始啟動的事件流程
[Frontend]
LAUNCH_DESKTOP_APP_COMMAND

[Backend]
-> APP_CONFIG_LOADED {app_config}
-> WORKSPACE_LOADED {workspace}
-> USER_DATA_LOADED {user_data}
-> DESKTOP_APP_DATA_READY_EVENT {app_config, workspace, user_data, ...}
```

### 「開啟檔案並編輯」的情境流程：

```
[初始訂閱流程]
UI (進入檔案編輯頁面) ->
Frontend EventBus (emit "subscribe_file", {fileId}) ->
WebSocketClient (send subscription) ->

[Backend]
WebSocket Server ->
Backend EventBus ->
SubscriptionHandler (處理訂閱)

[使用者開啟檔案]
UI (點擊檔案) ->
Frontend EventBus (emit "open_file") ->
WebSocketClient (send command) ->

[Backend]
WebSocket Server ->
Backend EventBus ->
CommandHandlers (on "open_file") ->
FileSystem Module (讀取檔案) ->
Events ("file_opened", {content, metadata}) ->
Backend EventBus ->
WebSocket Server ->

[Frontend]
WebSocketClient (receive "file_opened") ->
Frontend EventBus (dispatch) ->
FileOpenedHandler ->
StateManager (更新 editor state) ->
Editor UI (顯示檔案內容)

[使用者編輯檔案]
Editor UI (輸入內容) ->
Frontend EventBus (emit "edit_file") ->
WebSocketClient ->

[Backend]
WebSocket Server ->
Backend EventBus ->
CommandHandlers (on "edit_file") ->
FileSystem Module (寫入檔案) ->
Events ("file_changed", {changes, metadata}) ->
Backend EventBus ->
WebSocket Server ->

[Frontend]
WebSocketClient (receive "file_changed") ->
Frontend EventBus (dispatch) ->
FileChangedHandler ->
StateManager (更新 editor state) ->
Editor UI (更新顯示)

[其他已連接的 Frontend Client 同步更新]
WebSocketClient (receive "file_changed") ->
Frontend EventBus (dispatch) ->
FileChangedHandler (如果訂閱了這個檔案) ->
StateManager (更新該檔案狀態) ->
Editor UI (如果開啟中則更新顯示)
```

### file watching and synchronization between the local filesystem, backend, and frontend file explorer.

```
[初始化檔案監控流程]
[Backend]
APP_STARTUP ->
FileWatcherService (初始化) ->
Backend EventBus (emit "file_watcher_ready") ->
FileWatcherService (開始監控工作區) ->

[Frontend 連線初始化]
UI (載入檔案總管) ->
Frontend EventBus (emit "subscribe_file_changes") ->
WebSocketClient (send "subscribe_file_changes") ->

[Backend]
WebSocket Server ->
Backend EventBus ->
SubscriptionHandler (註冊檔案變更訂閱)

### [本地檔案系統變更]
Local Filesystem (檔案變更) ->
FileWatcherService (偵測變更) ->
Backend EventBus (emit "file_system_changed", {
  type: "created" | "modified" | "deleted" | "renamed",
  path: string,
  metadata: object
}) ->
WebSocket Server (broadcast to subscribers) ->

[Frontend]
WebSocketClient (receive "file_system_changed") ->
Frontend EventBus (dispatch) ->
FileExplorerHandler ->
StateManager (更新檔案總管狀態) ->
FileExplorer UI (更新顯示)

[檔案總管操作同步]
FileExplorer UI (執行檔案操作) ->
Frontend EventBus (emit "file_operation", {
  type: "create" | "delete" | "rename" | "move",
  path: string,
  metadata: object
}) ->
WebSocketClient (send command) ->

[Backend]
WebSocket Server ->
Backend EventBus ->
CommandHandler (處理檔案操作) ->
FileSystem Module (執行檔案操作) ->
FileWatcherService (偵測變更) ->
Backend EventBus (emit "file_system_changed") ->
WebSocket Server (broadcast to subscribers) ->

[其他 Frontend Clients 同步更新]
WebSocketClient (receive "file_system_changed") ->
Frontend EventBus (dispatch) ->
FileExplorerHandler ->
StateManager (更新檔案總管狀態) ->
FileExplorer UI (更新顯示)

[錯誤處理流程]
[Backend]
FileWatcherService (發生錯誤) ->
Backend EventBus (emit "file_watcher_error", {error}) ->
WebSocket Server (broadcast to subscribers) ->

[Frontend]
WebSocketClient (receive "file_watcher_error") ->
Frontend EventBus (dispatch) ->
ErrorHandler ->
UI (顯示錯誤訊息)
```
