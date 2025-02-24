# Workspace 資料夾結構設計

## 基本架構

```
workspace/
├── t21-hello_world/                # 任務資料夾
│   ├── s0-planning/               # 步驟資料夾
│   │   ├── c01-20240121_153000.chat.json  # 聊天記錄（按時序）
│   │   └── c02-20240121_154500.chat.json
│   │
│   ├── s1-implementation/
│   │   ├── c01-20240121_153000.chat.json
│   │   ├── c02-20240121_154500.chat.json
│   │   ├── navbar.v1.py           # 生成 doc
│   │   ├── navbar.v2.py           # 生成 doc
│   │   └── api-spec.md            # 生成 doc
│   │
│   ├── task_history/              # Task 狀態歷史紀錄
│   │   ├── task.20240121_153000.json
│   │   └── task.20240121_154500.json
│   │
│   └── task.json                  # 當前任務狀態與設定檔
│
├── t20-feature_xyz/
└── t19-bug_fix/
```

## 檔案命名規範

### 1. 任務(Task)資料夾

- 格式：`t[編號]-[名稱]`
- 範例：
  - `t21-hello_world`
  - `t20-feature_xyz`
  - `t19-bug_fix`

### 2. Subtask 資料夾

- 格式：`s[編號]-[名稱]`
- 範例：
  - `s0-planning`
  - `s1-implementation`
  - `s2-testing`

### 3. 聊天(Chat)檔案

- 格式：`c[序號]-[時間戳].chat.json`
- 範例：
  - `c01-20240121_153000.chat.json`
  - `c02-20240121_154500.chat.json`

### 4. 工作檔案 Documents

- 格式：`[標題].[版本序號].[副檔名]`
- 範例：
  - `navbar.v1.py`
  - `navbar.v2.py`
  - `api-spec.md`

### 5. Task 歷史紀錄

- 格式：`task.[時間戳].json`
- 範例：
  - `task.20240121_153000.json`
  - `task.20240121_154500.json`

## 檔案內容規範

### task.json

```json
{
  "id": "t_8f4e2d1c",
  "seq_number": 21,
  "title": "Hello World Implementation",
  "status": "in_progress",
  "current_subtask_id": "s_a1b2c3d4",
  "subtasks": [
    {
      "id": "s_a1b2c3d4",
      "task_id": "t_8f4e2d1c",
      "seq_number": 1,
      "title": "Implementation Phase",
      "status": "in_progress",
      "description": "Implement core functionality of Hello World feature",
      "team": {
        "leader": "john_doe",
        "members": ["alice", "bob"]
      },
      "input_type": "string",
      "output_type": "string"
    }
  ],
  "folder_path": "t21-hello_world",
  "config": {
    "priority": "high",
    "deadline": "2024-02-01T00:00:00Z"
  },
  "created_at": "2024-01-21T15:30:00Z",
  "updated_at": "2024-01-21T16:45:00Z"
}
```

### [序號]-[時間戳].chat.json

```json
{
  "_type": "chat",
  "chat_id": "c_5e6f7g8h",
  "created_at": "2024-01-21T15:30:00Z",
  "updated_at": "2024-01-21T15:45:00Z",
  "title": "UI 設計討論",
  "messages": [
    {
      "role": "user",
      "content": "...",
      "timestamp": "2024-01-21T15:30:00Z"
    },
    {
      "role": "assistant",
      "content": "...",
      "timestamp": "2024-01-21T15:31:00Z"
    }
  ]
}
```

## 設計重點說明

1. Task Object 簡化：

   - 移除 docs 與 chats 的追蹤，改由掃描資料夾取得
   - 專注於任務本身的狀態與設定
   - 維護 subtasks 的完整資訊
   - current_subtask_id 用於追蹤當前執行的子任務

2. Task 歷史記錄：

   - 新增 task_history 資料夾存放歷史版本
   - 每次更新 task.json 時自動備份
   - 使用時間戳命名確保版本順序
   - 防止意外遺失任務狀態

3. 資料夾結構：

   - 維持清晰的層級關係
   - 統一的命名模式
   - 直觀的版本追蹤
   - 新增歷史記錄管理

4. 檔案命名：

   - 使用單字母前綴（t, s, c）提高簡潔性
   - 保持檔案類型的清晰識別
   - 版本控制整合於檔名中（.v1, .v2）

5. 系統運作：
   - task.json 作為主要的任務控制檔案
   - 自動備份機制確保數據安全
   - 透過資料夾掃描獲取文件資訊
   - 不依賴手動重建 task.json
