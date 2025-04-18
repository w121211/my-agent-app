# AI 秘書應用設計：概念與實作 Q&A

## 核心理念

### Q: 這個 AI 秘書應用的設計核心是什麼？

A: 核心設計理念是「Push not pull」。因為人都很懶，所以我希望有一個 AI 秘書，我只要「給予工作指示」和「確認」，至於工作的進行就盡量交給 AI 自己去跑。

想像一下，我每天工作的第一步就是看 dashboard，查看 AI 要我做哪些 Review、Approve，確認後 AI 就繼續去執行。如果有新工作，我只要給基本的工作指示，AI 跟我確認細節後，就由 AI 去執行。

這樣的設計能讓使用者減少主動尋找下一步該做什麼的心智負擔，轉而由系統主動推薦並執行，大幅提高工作效率。

### Q: 這個系統跟一般的 AI agent system 有什麼不同？

A: 主要差別在於兩個方面：

1. **半自動 vs 全自動**：目前主流的 agent system 都朝向全自動發展，但實際上，半自動更符合許多工作流程的需求。例如，在開發過程中遇到問題，我可能會問 AI，它給了解決方案，我覺得不錯，自然會按照這個解法去實作。人機協作的半自動模式往往比純自動化更實用。

2. **可追蹤、修改、重複利用**：很多工作是重複性的，比如翻譯新聞和摘要。我已經有經過反覆優化的好 prompt，現在只需要換一下 input，然後重新執行這個任務，就能得到想要的結果。全自動系統無法滿足這種需求，我更需要的是能重複利用已優化工作流程的工具。

所以，我設計的不是單純的全自動系統，而是一個可高度編輯的 AI 工作流編輯器。這個編輯器同時作為工作管理工具，加上 dashboard 和 AI 建議的「下一步」任務，實現基本的 push not pull 理念。

### Q: 「下一步」功能是什麼？為什麼需要它？

A: 「下一步」功能解決了一個常見問題：當我完成一個任務後，常常會 pending 在那裡，不知道下一步該做什麼，或者因為剛完成一項工作已經精疲力竭，想偷閒一下。

這時候，如果有個 [Next] 按鈕，我只要點一下，AI 就會幫我思考「下一步該做什麼」，並規劃、生成下一步需要的 prompt 等，讓 AI 自己去執行下一個工作，我當然很樂意。

舉例來說，我在開發時遇到問題，與 AI 討論得到結論後，點「下一步」，AI 建議基於這個討論做設計，我點「OK」，AI 完成設計後又建議實作代碼，再點「下一步」進行測試，接著 commit 等等。

在 AI 執行工作期間，我可以休息，等 AI 出結果後再查看是否符合需求。如果做得不好，再修改 prompt 或 input 即可，「修改」總比「從零開始」簡單輕鬆。總之就是「先跑看看」！

這樣的流程可以增加工作效率，又減少我的工作量（只需出一張嘴就好），何樂不為？

## 系統架構

### Q: Workspace 和 Task 的設計架構是什麼？

A: 我們採用了類似檔案系統的層次結構：

```
/(Workspace/Project) OCR and translate a book
|- [new chat button]
|- /(task) OCR and translate a book manual
|  |- [new chat button]
|  |- chat_03.v{timestamp}.json  // prompt: 「對 p3.jpg 做 OCR & 翻譯」
|  |- chat_02.v{timestamp}.json  // prompt: 「對 p2.jpg 做 OCR & 翻譯」
|  |- chat_01.v{timestamp1}.json, chat_01.v{timestamp2}.json // 版本控制
|  |- task.json  // 以此判斷這是一個 task folder
|  |- p1.jpg, p2.jpg, p3.jpg, ...
|- /(task) OCR and translate a book by agent
|  |- [new chat button]
|  |- chat_01.v{timestamp}.json
|  |- task.json
|- /Any other folder, not task related
```

這種設計讓我們可以：

1. 有清晰的工作層次結構
2. 通過 task.json 標識 task 文件夾
3. 使用時間戳進行版本控制
4. 在同一個 task 下存放相關檔案和多個聊天

我們還有一個專注在 task 執行和串連的簡化 UI 設計：

```
/(Workspace) Develop a startup app
|- /(task) [Run Button] commit event channel code
|- /(task) [Run Button] 對 event channel code 寫測試
|- /(task) [Run Button] 依照設計實作 event channel code
|- /(task) [Run Button] 參考討論串重新設計 event channel
|  |- (entrypoint) chat_01_{timestamp}.json  // 引用上一個 task 的 artifact
|  |- artifact_設計.v{timestamp}.md  // AI 生成的結果
|- /(task) [Run Button] Events 在前後端傳輸時碰到 websocket 斷連情況要如何做
   |- (entrypoint) chat_01_{timestamp}.json
   |- artifact_討論串整理.v{timestamp}.md
```

### Q: Task 和 Chat 的定義和關係是什麼？

A: **Task（任務）定義**：

1. Workspace 是一個 folder，task 也是一個 folder。每個 task folder 裡會有一個 task.json，用來標識這是一個 task。
2. 由於使用 folder 形式，自然地，一個 project folder 可以有多個 task folders，一個 task folder 也可以有多個 subtasks。
3. Task 中包含：chat files, task.json，以及其他相關檔案。

**Chat（聊天）定義**：

- Chat 就是讓用戶與 AI 對話，可選擇使用的模型。基本上是 AI 與用戶之間的問答，包含功能如 Agent、Web search 等。
- Chat 檔案格式：`chat_{id_or_title}.{timestamp}.json`
  - 以 "chat\*.json" 判斷是否為 chat
  - ID 或 title 可以簡單命名或有意義的命名
  - Timestamp 為創建時間戳，用於版本控制

**為什麼一個 task 需要多個 chats**：
Chat 可以是任務本身，也可以是純粹的問答，與任務相關但不直接涉及任務本身。例如，寫外文回覆郵件時，如果對某些用詞有疑問，可能想單獨開一個對話問 AI，這時開在同一個 task 裡面最為適合。

### Q: 如何管理 Task Knowledge？

A: 我們考慮了兩種方案：

**方案 1**：使用專門的 /task_knowledge folder，裡面的檔案視為 task knowledge，這些檔案會自動被注入到 task 中：

```
/task
|- /task_knowledge
   |- a.py, b.py
   |- task_instruction.md
```

**方案 2**：直接通過 UI 方式顯示和控制哪些檔案被放入 knowledge。

但後來發現，我們其實可以使用更靈活的檔案注入寫法。在 prompt 中使用 `#檔案路徑` 的方式注入，可以透過 copy/paste 快速調整 prompt，例如：

```
Chat 1v1：「#a.py #…/event/test 請參考 tests，為某 class 寫 test」
Chat 1v2：「#a.py #b.py #…/event/test 請參考 tests，為某 class 寫 test」
Chat 2：「#a.py #b.py #…/event/test …」
```

我們甚至可以預設將 task folder（不包含子階層）的所有檔案納入到 `<task_knowledge>`，通過 XML 的方式讓用戶自行修改調整：

```
<task_knowledge>
#p1.jpg #p2.jpg
#*.jpg (或直接用 wild card)
</task_knowledge>

<task_instruction> … </task_instruction>

請對 p1.jpg 做 OCR
```

Task knowledge 也會記錄在 task.json 中，當用戶在 prompt 中調整 task knowledge 時更新。

## 執行流程

### Q: 任務執行流程是怎樣的？

A: 我們有幾種執行模式：

**1. 基本 Rotation 模式**：user -> ai -> user ...

**2. Agent 模式**（MVP 初期不考慮）：

```
user (初始任務） -> （ ai (planner) -> ai (action) -> system -> ）
```

循環直到觸發終止條件（agent 判斷任務完成、maximum budget、iteration）

**3. Group chat 模式**（MVP 不考慮）：

```
user -> ai 1 -> ai 2 -> ai 3 -> user ...
```

（其實還是 rotate 的一種）

### Q: 如何執行 Task Chain 和 Task 下的多個 Chats？

A: 對於 Task Chain（任務鏈），當 tasks 依賴於前面 task output 時，自然形成一個 dependency run graph。

在 MVP 階段，我們採用較簡單的方式：不管 run graph，用戶跑哪個就是哪個，不會自動跑下一個。

對於 Task 下的多個 Chats 執行：

- 初步設計是不分青紅皂白，依序執行每個 chat。
- 更好的做法是讓使用者決定需要執行的 chats 和執行順序，因為很多 chats 可能不涉及任務本身，不該被執行。

一個典型的 chat chain 例子是「對掃描檔做 OCR」：

```
Chat 1: 對 p1.jpg 做 OCR
-> Chat 2: 對 p2.jpg 做 OCR
-> Chat 3: 對 p3.jpg 做 OCR
```

或者「按照設計寫程式碼」：

```
Chat 1: 現在已經完成：(empty)，請寫：code1
-> Chat 2: 現在已經完成：code1，請寫：code2
-> Chat 3: 現在已經完成：code1, code2，請寫：code3
```

### Q: 如何實現更自動化的工作流程？

A: 我們有幾種自動化程度的選擇：

**全自動做法**：使用 agent
例如：用戶「對掃描檔做 OCR (開啟 agent)」-> AI analyze, deliver plan, run in loop, output file

**半自動做法**：

1. **[下一步]**：用戶「對 p1.jpg 做 OCR」-> AI 產出結果 -> 用戶點 [下一步] -> AI 自動生成下個 task -> 用戶點「run task」
2. **AI 建議 prompt**（MVP 初期不考慮）：用戶「對 p1.jpg 做 OCR」-> ... -> 用戶點 [new chat] -> 輸入 prompt 時，AI 提示輸入「對 p2.jpg 做 OCR」
3. **AI 建議 prompts**（MVP 不考慮）：用戶「對 p1.jpg 做 OCR」-> ... -> 用戶點 [new chat] -> 輸入 prompt 時，AI 提示輸入「對 p2.jpg 做 OCR （command: new chat: 對 p3.jpg 做 OCR） （command: new chat: 對 p4.jpg 做 OCR）」

## UI 設計

### Q: Chat Panel 的用戶輸入框設計是什麼樣的？

A: UI 設計如下：

```
(Text Input Box)
--------------------------------------------------|
|                                                  |
|                                                  |
|                                                  |
--------------------------------------------------|
[Agent] [New Task] [Claude 3.7] [Submit]
```

說明：

- [Agent], [New Task]：可選按鈕，實際上是 radio button，有 selected、unselect 兩種狀態
- [Agent]：使用 agent 模式
- [New Task]：用戶輸入 prompt 並送出後，會創建新的 task folder，包含 task.json 和當前的 chat.json
- [Claude 3.7]：選擇使用的 AI 模型
- [Submit]：提交 prompt

### Q: 點擊 chat.json 或 [New Chat] 後會發生什麼？

A: **點擊 chat.json 後**：

1. 用戶在 workspace explorer 上點擊 `chat.json` 檔案
2. 中間欄開啟 chat panel，顯示對話記錄，底下有個輸入框，可以繼續與 AI 對話

**點擊 [New Chat] 後**：

1. chat panel 開新 chat
2. 用戶輸入 prompt 並送出後，若沒有點選 new task，就創建一個新的 chat.json；反之則創建新的 task folder，包含當前的這個 chat

## 結語

這個設計整合了 AI 工作流編輯器、執行器和任務進度管理，讓用戶能更輕鬆地規劃、執行和管理工作。核心是「半自動化」和「push not pull」理念，讓 AI 成為主動推薦下一步的助手，而不僅僅是等待命令的工具。

我們希望透過這種設計，大幅減少用戶在工作管理上的心智負擔，讓工作自然流暢地進行，而用戶只需專注於決策和確認。這正是「出一張嘴就好」的極致體現。
