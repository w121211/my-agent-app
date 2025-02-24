架構：
```
[Frontend]
UI → CommandHandlers → WebSocketManager → 
[Backend]
WebSocket Server → EventBus broadcast → CommandHandlers → 
Business Logic → events → EventBus broadcast →
WebSocket Server (broadcast all events) → 
[Frontend]
WebSocketManager → StateManager → UI
```

使用情境：
```
例如：用戶編輯檔案
1. 用戶在 UI 點擊儲存
2. CommandHandlers 將動作轉換為 "save_file" 命令
3. 通過 WebSocket 發送到後端
4. 後端 EventBus 收到命令並廣播
5. CommandHandlers 處理儲存邏輯
6. 儲存完成後產生 "file_saved" event
7. EventBus 廣播此 event
8. 所有連接的前端都收到 "file_saved" event
9. 前端更新檔案狀態
```
