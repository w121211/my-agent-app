<!-- Prompt logs - for record-keeping only, do not reference.

Rerun backups
- Naive （MVP）：只要rerun，就存一個新的 chat file record（new uuid），不用管他實際上是否變更
    - Branch 資訊不變
- 更進階的做法可能是，就保留n個過去的rerun紀錄，避免佔用過多空間


```
chat_versions:
  uuid (TEXT PRIMARY KEY)           -- 版本唯一ID
  file_path (TEXT NOT NULL)         -- 對應的檔案路徑
  version_number (INTEGER NOT NULL) -- 0, 1, 2, 3...

  -- 內容存儲
  content (TEXT NOT NULL)           -- 完整的 JSON 內容
  content_hash (TEXT NOT NULL)      -- 內容 hash

  -- 關聯關係
  parent_uuid (TEXT)                -- 來源版本，NULL表示初始版本
  branch_type (TEXT NOT NULL)       -- 'edit', 'rerun'
  branch_point_message (INTEGER)    -- 從第幾個 message 分岔

  -- 時間戳
  created_at (TIMESTAMP NOT NULL)

  -- 元數據（從內容提取）
  title (TEXT)                      -- chat 標題
  message_count (INTEGER)           -- 訊息數量
```

不需要
- branch_type -> 不需要，rerun 直接用 rerun_at timestamp 來記錄不就好了？所以 branch 就只有修改 message 才會發生

改名
- branch_parent_uuid -> 更清楚

增加
- rerun_at
- branch_at
- updated_at
- created_at

不確定
- branch_version_number ->
    -  需要嗎？branch_at 的時間戳應該足夠用於作為 version？只是我們確實還需要一個 version number （v1, v2, …）來幫助 user 辨識、閱讀
    - 當 rerun 時，因為branch資訊完全相同，代表會有兩個同樣的 version number，例如 v10，這樣會有問題嗎？
        - 假設我們現在有 v10-run1, v10-run2, v11, v1，naive 做法就是當使用者選擇了 v10，因為會找到兩個 v10（但不同 uuids），根據latest update 載入最後編輯的file（例如 v10-run2），並在原本的 version dropdown 旁增加一個 runs dropdown，用於顯示他是 v10, run2

---

Version dropdown 的執行效果：瀏覽不同 version 的 chat file
1. 前 version chat file 已經轉為 archive 模式，不能發送新訊息
2. 但可以編輯原本的訊息 ＆ resend，這會 trigger branch
3. 在瀏覽狀態時：當前檔案 chat.json 仍維持原本的 version
    1. 例如當前為 v10，使用者選擇瀏覽 v7，chat.json 仍然是 v10，不會變
4. 只有當 trigger branch 時，才會按照 branch 的做法，branch 後的檔案取代原本的檔案
    1. 例如當前為 v10，使用者選擇瀏覽 v7 ＆ 修改 message 後重新送出（trigger branch），編輯後的檔案（v11）會取代原本的 chat.json，資料庫中增加一個 v11 的chat-file record



> 用戶編輯並發送：
1. 當前內容存入 DB（版本號 +1）
2. 新內容寫入檔案
3. 更新 current_files 指針

你覺得哪個比較好？為什麼？
1. 工作區的file 同時也存在 DB
2. 或是只有當branch 時才會存在 DB

請分析，不要code




如果使用者預覽 previous version，例如當前為 v3，使用者選擇 v2，
- 當前檔案 chat.json 還是維持 v3
- 只有

請基於此再想想






1. branch file 命名：假設有一個 chat1.json (v0)，分叉後變成
    1. 分岔的新檔(v1) 使用原始檔案名 `chat1.json`，但在 json 中紀錄 {version: [1]} ？
    2. 原檔改名為：chat1.v0.json，並移到當前 directory 的 branches 檔案庫中，例如 ./chat_history/chat1.v0.json
2. 假設目前有分岔 v0, v1, v2, v3，使用者回到 v2 更改 message 後重新送出（這會 trigger 分岔），因為是從 v2，照道理應該是 v3，但 v3 被占了，是不是就把此最新直接叫 v4？
3. `./chat_branch/chat1.v0.json` 如果碰到了chat檔改名（例如改成 chat-hello.json）的情況，是不是就無法辨識了？
    1. 某種程度是，雖然可以靠 id（存在 chat file 裡） ＆ 遍歷來檢查檔案是否更名，但我不覺得這過於 hard code，not smart
4. 分岔檔案儲存：有其他好的儲存做法嗎？

讓我們也想想看rerun chat時會發生什麼事
1. 假設我們有個 chat1.json (v0)，rerun v0，可能因爲引用外部檔案或是function calling 造成內容改變，從而產生與 v0 不同的產出，這個時候，我們該如何處理原始的 v0，以及 rerun 後的？
    1. 我覺得，Rerun 跟 Branch是兩個不同的東西，branch 是使用者主動去修改迭代原本的 chat，run則是產出結果，兩者要分開處理
2. Runs 要不要儲存？
    1. 我的想法是，有儲存總比沒儲存好
    2. 但在 MVP 階段，不需要複雜的儲存系統
    3. 如果參考 branches 的儲存方式，可以簡單的存在當前 folder 下，例如 ./chat_history/chat1.run{timestamp}.json
    4. 因為是 run chat file，所以命名就是以 {chat_file_name}.run{timestamp}.json -> 這種命名會不會有問題？

---

（重新思考）

1. 考慮到MVP，我覺得 branches 可能不會那麼急，但是 runs 是核心功能，需要
2. 看起來，branches 跟 runs 可以用一樣的處理方法
3. 我還是希望能儲存在 sub folder 中，避免使用者覺得當前的工作資料夾過亂（？）
4. 基於時間戳的命名 okay，簡單直覺，version 可以是紀錄在 json data 裡面
5. 假設現在為 v11，但因為刪掉 folder 或是各種奇怪原因，找不到過去的 version，還是保留當前的 v11，但 dropdown 中就不會有其他的 versions

```
{
  "metadata": {
    “created_at”: // timestamp
    “updated_at”: // timestamp

>> 改成這樣如何？
“uuid”: string // 避免檔名變更

“branch_version”: number // incremental
>> （naive）在 branch action（複製檔案等）時，看當時能找到最後的版本是多少，例如 v10，則此版本就自動增加1個，設為v11

“branch_from_uuid”: string?  // 是從哪里分岔的
“branch_v0_uuid”: string
“”

  },
  "messages": [...]
}
```

如果是使用者 duplicate chat file 怎麼處理？
1. 假設每個 chat 都有 uuid，則這個 uuid 會重複
2. 我們不能阻止使用者在外部做 duplicate chat file，所以一定會有 uuid 重複的情況
3. MVP階段需要管嗎？可以直接無視嗎？
4. 或是如果有發現重複的情況，我們是不是可以透過 json data辨識，來給予新的 uuid？

Chat file 儲存的路徑 `{ absolute_path: ‘…’  }` 與當前實際路徑不同時，幾種可能＆處理
1. Move file ：檢查原始路徑是否存在原檔，如果不存在，當作 move，不更改 uuid
2. Duplicate file：原始路徑存在原檔，1. 更改路徑 2. 創新uuid

若發現當前 chat files 中有重複的 uuid（不管什麼原因）
1. 如何 resolve？
2. 或不 resolve？丟給使用者自行判斷？
3. MVP階段需要處理嗎？

若使用者移動 chat file ，是不是也要跟著處理 subfolder `./chat_history`
1. 這樣會造成後端很難搞
2. 比較好的做法或許是把branches, runs都存在一個 lightweight db `<project>/{chat_db}`？


---

讓我們討論 branch、run
純粹討論，不要code
請先針對我提出的想法，檢視、想想、給予意見
 -->

# 📋 Chat Files 版本管理系統設計

## 🎯 核心概念

### 檔案系統 vs 資料庫分工

```
檔案系統（用戶可見）：
project/
├── chat1.json          # 當前工作版本
├── analysis.md
└── task1.json

資料庫（系統管理）：
- 存儲所有歷史版本的完整內容
- 管理版本間的關聯關係
- 用戶透過 UI 查看歷史，不直接接觸
```

### Branch vs Rerun

- **Branch**：用戶修改 message 並重新發送 → 產生新版本號（v1 → v2）
- **Rerun**：重新執行現有版本 → 版本號不變，產生新的執行記錄

## 🗄️ 資料庫結構

```sql
-- For now，DB只是歷史庫（儲存branches），工作區的chat file不儲存（file優先）

chat_files:
  uuid                    -- 版本唯一ID
  file_path              -- 檔案路徑 absolute path

  -- branch
  branch_version_number  -- v0, v1, v2...（只有 branch 會增加）
  branch_group_uuid      -- branches 共享一個 group id
  branch_parent_uuid     -- 分支來源
  branch_point_message   -- 從第幾個 message 分岔

  -- 時間戳
  created_at             -- 記錄建立時間
  updated_at             -- 內容更新時間
  branch_at              -- 分支時間（branch 才有）
  rerun_at               -- 重跑時間（rerun 才有）

  content                -- 完整的 JSON 內容
  content_hash           -- 內容 hash

  -- others...
```

## 🔄 核心操作

### 1. Branch 操作（修改 message & resend）

```
用戶編輯已送出的 message 並重新發送：
1. 當前內容存入 DB（版本號 +1）
2. 新內容寫入檔案（不存入DB）
```

### 2. Rerun 操作（重新執行）

```
重跑某版本：
1. 從 DB 載入指定版本
2. 執行 AI 對話
3. 【MVP】無論結果是否相同，都存新記錄
4. Branch version number 保持不變，只記錄 rerun_at
5. 新結果寫入檔案
```

### 3. 檔案重命名

```
chat1.json → analysis.json：
1. 更新所有相關版本的 file_path
2. 更新 current_files 記錄
3. 檔案系統操作由用戶自行處理
```

## UI

### Chat Panel 模式

**一般模式**：

- 編輯當前版本
- 可發送新訊息
- chat.json = 當前內容
- UI 上不用特別標明

**瀏覽模式**：

- 查看歷史版本
- chat.json file 內容不變(維持工作中的檔案，非歷史檔案)
- UI 顯示歷史內容（從 DB 讀取），標明正在瀏覽歷史版本
- 輸入框禁用，不能發送新訊息（符合 Archived 概念）
- 但允許「編輯」訊息
  - 一旦編輯＆送出，觸發 branch
  - 新分支內容取代 chat.json
  - 自動切回一般模式

### UI - 版本 Dropdowns

```
沒有 versions & runs 時
（無 dropdown）

當有多個 versions
[v3 ▼]

當有多個 runs
[Run 2 ▼]

當有 versions, runs
[v3 ▼] [Run 2 ▼]

當選擇 run 版本：
[v10 ▼] [Run 2 ▼]
         ├── 原版 (09:00)
         ├── Run 1 (10:15)
         └── Run 2 (10:30) ← 預設最新
```

### 🔍 查詢

- 版本列表（去重 rerun）
- 特定版本的所有 runs

## 🛠️ 容錯處理（目前忽略，未來考慮加入）

### 應用啟動檢測

```
1. 掃描 current_files 中的所有檔案
2. 比較檔案內容與 DB 記錄
3. 內容不同 → 建立新 rerun 記錄
4. 檔案不存在 → 標記狀態
```

### 專案複製處理

```
檢測到 UUID 重複：
1. 為整個專案重新生成 UUID
2. 保持版本關聯關係
3. 靜默處理，不打擾用戶
```

## 📝 MVP 簡化原則

1. **Rerun 策略**：無論結果是否變更都存儲，未來再考慮清理歷史 run records 機制
2. **檔案命名**：用戶完全自由，系統不干預
3. **功能範圍**：不支援分支合併、標籤等複雜功能
4. **衝突處理**：自動修復為主，減少用戶介入

## 🎯 用戶體驗要點

- **檔案系統簡潔**：用戶只看到工作檔案，歷史透過 UI 存取
- **無縫切換**：瀏覽歷史時不影響當前工作
- **靈活分支**：可從任何歷史版本創建新分支
- **安全確認**：分支操作會影響當前檔案時給予提示
