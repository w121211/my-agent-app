# 整合式 UI 事件流設計

本文檔提出一個簡化且更具擴展性的 UI 事件流設計，通過整合相似事件流和建立更抽象的事件類型，優化前端狀態管理和事件處理邏輯。

## 核心設計原則

1. **狀態驅動**：關注實體和資源的狀態變更，而非單個操作
2. **事件整合**：合併功能相似的事件，減少事件類型總數
3. **數據豐富化**：事件攜帶完整信息，減少額外請求
4. **統一處理模式**：建立通用事件處理邏輯，提高可維護性

## 事件層級架構

設計採用三層事件架構：

```
UI 事件 (用戶交互) → 客戶端命令 (系統操作) → 伺服器事件 (狀態變更)
```

## 核心事件類型

將原有的多種事件整合為五種核心狀態變更事件：

1. `SERVER_CHAT_STATE_CHANGED` - 聊天相關狀態變更
2. `SERVER_ENTITY_STATE_CHANGED` - 任務、子任務等實體狀態變更
3. `SERVER_FILE_STATE_CHANGED` - 檔案內容和狀態變更
4. `SERVER_EXPLORER_STRUCTURE_CHANGED` - 資源樹結構變更
5. `SERVER_FOCUS_CHANGED` - 用戶焦點和導航路徑變更

## 詳細事件流設計

### Task 相關事件流

#### 創建新任務

```
UI_NEW_TASK_BUTTON_CLICKED
  → UI_PROMPT_INPUT_MODAL_OPENED
    → CLIENT_CREATE_TASK_COMMAND
      → SERVER_ENTITY_STATE_CHANGED {type: "task", action: "created", data: {...}}
        → UI更新任務狀態顯示
      → SERVER_EXPLORER_STRUCTURE_CHANGED {type: "add", entityType: "task", nodeData: {...}}
        → UI更新資源樹
      → SERVER_FOCUS_CHANGED {path: [...], type: "task", id: "taskId"}
        → UI更新導航與顯示內容
```

#### 任務狀態變更

```
UI_TASK_ACTION_BUTTON_CLICKED {action: "pause"|"resume"|"complete"}
  → CLIENT_UPDATE_ENTITY_STATE_COMMAND {type: "task", id: "taskId", action: "..."}
    → SERVER_ENTITY_STATE_CHANGED {type: "task", id: "taskId", state: "...", data: {...}}
      → UI更新任務狀態顯示
```

#### 任務節點展開/折疊 (本地操作)

```
UI_TASK_NODE_CLICKED
  → UI本地狀態更新 (不需要伺服器參與)
    → UI_EXPLORER_TREE_VIEW_UPDATED
```

### Subtask 相關事件流

#### 子任務操作 (開始/暫停/完成)

```
UI_SUBTASK_ACTION_BUTTON_CLICKED {action: "start"|"pause"|"complete"}
  → CLIENT_UPDATE_ENTITY_STATE_COMMAND {type: "subtask", id: "subtaskId", action: "..."}
    → SERVER_ENTITY_STATE_CHANGED {type: "subtask", id: "subtaskId", state: "...", data: {...}}
      → UI更新子任務狀態顯示
    → (如需啟動新聊天) SERVER_CHAT_STATE_CHANGED {chatId: "...", action: "created", data: {...}}
      → UI更新聊天界面
    → (如需更新焦點) SERVER_FOCUS_CHANGED {path: [...], type: "subtask", id: "subtaskId"}
      → UI更新導航與顯示內容
```

#### 新建子任務聊天

```
UI_SUBTASK_NEW_CHAT_BUTTON_CLICKED
  → CLIENT_CREATE_CHAT_COMMAND {taskId: "...", subtaskId: "..."}
    → SERVER_CHAT_STATE_CHANGED {chatId: "...", action: "created", data: {...}}
      → UI更新聊天界面
    → SERVER_EXPLORER_STRUCTURE_CHANGED {type: "add", entityType: "chat", nodeData: {...}}
      → UI更新資源樹
    → SERVER_FOCUS_CHANGED {path: [...], type: "chat", id: "chatId"}
      → UI更新導航與顯示內容
```

### Chat 相關事件流

#### 發送聊天消息 (統一處理一般消息和附件)

```
UI_CHAT_MESSAGE_SUBMITTED {content: "...", attachments?: [...]}
  → CLIENT_SUBMIT_MESSAGE_COMMAND {chatId: "...", content: "...", attachments?: [...]}
    → SERVER_CHAT_STATE_CHANGED {
        chatId: "...",
        action: "messageAdded",
        messageData: {...},
        typing?: true
      }
      → UI更新聊天界面 (顯示用戶消息)
      → UI更新輸入狀態 (顯示AI正在回應)

    → (當AI回應生成後) SERVER_CHAT_STATE_CHANGED {
        chatId: "...",
        action: "messageAdded",
        messageData: {...},
        typing: false
      }
      → UI更新聊天界面 (顯示AI回應)
      → UI更新輸入狀態 (允許用戶輸入)
```

#### 批准子任務結果 (特殊消息)

```
UI_CHAT_MESSAGE_SUBMITTED {content: "...", approval: true}
  → CLIENT_SUBMIT_MESSAGE_COMMAND {chatId: "...", content: "...", approval: true}
    → SERVER_CHAT_STATE_CHANGED {chatId: "...", action: "messageAdded", messageData: {...}}
      → UI更新聊天界面
    → SERVER_ENTITY_STATE_CHANGED {type: "subtask", id: "...", state: "completed", data: {...}}
      → UI更新子任務狀態
    → SERVER_ENTITY_STATE_CHANGED {type: "subtask", id: "nextSubtaskId", state: "started", data: {...}}
      → UI更新下一子任務狀態
    → SERVER_FOCUS_CHANGED {path: [...], type: "subtask", id: "nextSubtaskId"}
      → UI更新導航與顯示內容
    → SERVER_CHAT_STATE_CHANGED {chatId: "newChatId", action: "created", data: {...}}
      → UI更新聊天界面 (新子任務的聊天)
```

#### 打開已有聊天

```
UI_CHAT_FILE_NODE_CLICKED
  → CLIENT_OPEN_FILE_COMMAND {type: "chat", id: "chatId"}
    → SERVER_FILE_STATE_CHANGED {
        type: "chat",
        id: "chatId",
        action: "opened",
        data: {...}  // 包含完整聊天數據
      }
      → UI更新聊天顯示
    → SERVER_FOCUS_CHANGED {path: [...], type: "chat", id: "chatId"}
      → UI更新導航與顯示內容
```

### 檔案相關事件流

#### 打開文檔檔案

```
UI_DOCUMENT_FILE_NODE_CLICKED
  → CLIENT_OPEN_FILE_COMMAND {type: "document", id: "fileId"}
    → SERVER_FILE_STATE_CHANGED {
        type: "document",
        id: "fileId",
        action: "opened",
        data: {...}  // 包含文件內容與元數據
      }
      → UI更新檔案內容顯示
    → SERVER_FOCUS_CHANGED {path: [...], type: "document", id: "fileId"}
      → UI更新導航與顯示內容
```

#### 編輯檔案

```
UI_EDIT_BUTTON_CLICKED
  → UI本地狀態更新 (切換為編輯模式)
    → UI_FILE_EDIT_MODE_ENABLED

// 儲存變更
UI_SAVE_BUTTON_CLICKED {content: "..."}
  → CLIENT_UPDATE_FILE_COMMAND {id: "fileId", content: "..."}
    → SERVER_FILE_STATE_CHANGED {
        id: "fileId",
        action: "updated",
        data: {...}  // 更新後的文件內容與元數據
      }
      → UI更新檔案顯示
      → UI關閉編輯模式
```

### Explorer 樹結構事件流

```
// 各種可能觸發 Explorer 更新的操作
[各種 UI 操作] → [相應客戶端命令]
  → SERVER_EXPLORER_STRUCTURE_CHANGED {
      type: "add"|"remove"|"update",
      entityType: "task"|"subtask"|"chat"|"document",
      parentId?: "...",
      nodeData: {...}
    }
    → UI更新資源樹顯示
```
