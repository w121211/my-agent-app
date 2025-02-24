# AI Chat Editor Architecture Design

## System Overview

Desktop application for AI chat and file editing:
- Frontend: Next.js
- Backend: Python server with event-driven architecture
- Local deployment: Both frontend and backend run on user's machine
- Main features: Workspace management, file editing, AI chat, agent execution

## Architecture Diagram

「開啟檔案並編輯」的情境流程：
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
