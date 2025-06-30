# 思考UX

### 我想到最直接的方式，就是在 Todos（這裡）寫下想做的事 → Run tasks (by agents)

- 像我的話 todos 會寫的很簡單，可能是之前已經提過的概念，或是我正在做的 project，所以AI需要自動結合前後文，來理解＆補強我的 todo，生成一個清楚的 task instruction, plan

```markdown
Todays' Todos

- 後端 client demo 檢視更新 [task#327]
- AI web app bridge [run task]
  - Search for open source [run task]
- [What's next] <!-- 人很懶，所以可能也會想要AI來幫忙想：我接下來要做啥 -->
```

- 又基於人是懶到不行，所以即便生成計畫後會請使用者確認，但多半使用者會想說「反正先跑跑看再說」
  - 詢問使用者是否授權給 agent 自動執行，不需使用者確認 → 同意的話就agent自行判斷＆執行
- ⇒ 基於「懶原則」
- Lazy first principle?
  - 不知道有沒有類似這種的說法？
- 所以按照使用經驗應該會是「反正我就不管三七二十一，總之先跑跑看」，當然可以「友善的」要使用者檢視計畫 → 執行，但我猜
- 現行 app 是沒有這個 todos，但有沒有辦法用現成機制去模仿這東西？
  - 因為這個更像是一個 meta assistant ，有點像我的貼身秘書，需要掌握全局訊息：目前所有的 projects, tasks, …
  - 原本的 app 已經有設計 task 自動創建＆執行（by agent），這裡需要的是一個好的介面來紀錄 todos ＆ launch tasks
  - 用個 dashboard 做這個介面應該是比較符合UX

---

# 產品思考＆討論

### 設計核心：Push not pull 是什麼？

因為人都很懶，所以我希望的是有一個 AI 秘書，我只要「給予工作指示」、「確認」，至於工作的進行就盡量交給 AI 自己去跑。想像是，我每天工作的第一步就是看 dashboard，看看 AI 要我做哪些 Review、Approve，確認後 AI 就繼續去跑。

如果有個新工作，我只要給基本的工作指示，AI 跟我確認細節、創新工作後，就由 AI 下去跑。

### 那你這個跟一般的 AI agent system 有什麼不同？

主要的差別在於

1. 半自動 vs 全自動
2. 可追蹤、修改、重複利用

目前主要的 agent system 都朝向全自動去做，但我覺得其實有許多東西，反而半自動更符合我的工作流，例如說，我可能在開發時碰到問題，問個 AI ，他給了點解法，我覺得不錯，自然會希望按此解法去實作。

有些工作是重複性的，例如翻譯新聞＆摘要，我已經有了經過不斷修改優化的好的 prompt，我現在需要的只是把 input 換掉，然後重跑一次這個 task，就可以得到我想要的結果。

本來目前在我的 AI 工作流中，我就需要去調整 prompt 來得到我想要的結果，所以我希望能重複利用這個已經優化好的工作流，當然也可以在過程中持續給他優化（修改prompt等），在此背景下，一個全自動的 ai agent 反而不符合我的需求，我更希望的是利用建構好的「工作流」來跑。

所以我需要的並不是只是單純的一個全自動系統，而是一個可以可高度編輯的 ai工作流編輯器。而這個編輯器也可同時作為工作管理，加個 dashboard、AI建議「下一步」任務，就可以實現基本的 push not pull。

AI 工作流編輯器＋執行器 <-> 任務執行進度管理

### 「下一步」是什麼？

當我做完一個 task 時，我可能會 pending 在那，不知道「下一步」要做什麼，或者是「懶」於做下一步，要知道，剛做完一個東西已經精疲力盡，總是會想讓人偷閒一下。

這時候，如果能給我一個「下一步」的按鈕，例如 [Next] ，我只要點下去，由 AI 來幫我想「下一步該做啥」 ＆ 規劃、生成下一步需要的 prompt 等等，讓 AI 自己去跑下一個工作，我當然很樂意。

舉例來說，我在 code 開發時碰到問題，與 AI 討論得到結論後，點「下一步」，AI 建議基於這個討論做設計，「ＯＫ」，跑完得到設計後，AI建議下一步implement code，（下一步）testing，（下一步）commit 等等。

在 AI 自己跑工作的時間我可以休息，等AI 出結果後再回來看看成果有沒有符合我的需求，做得不好再來修改 prompt、input 等等就是，「修改」總比「從零開始」簡單輕鬆。總之就是「先跑看看」！

這樣的流程又可以增加工作效率，又可以減少我的工作量（出一張嘴就好），何樂不為？

### Workspace folder structure的設計？

/(Workspace/Project) OCR and translate a book

- [new chat button]
- /(task) OCR and translate a book manual
  - [new chat button]
  - chat_03.v{timestamp}.json // prompt: 「對 p3.jpg 做 OCR & 翻譯」
  - chat_02.v{timestamp}.json // prompt: 「對 p2.jpg 做 OCR & 翻譯」
  - chat_01.v{timestamp1}.json, chat_01.v{timestamp2}.json, chat_01.v{timestamp3}.json // 更新chat 會保留原本的 chat，用 timestamp 做 version control
  - task.json // 以此判斷這是一個 task folder
  - p1.jpg, p2.jpg, p3.jpg, …
- /(task) OCR and translate a book by agent
  - [new chat button]
  - chat_01.v{timestamp}.json
  - task.json // 以此判斷這是一個 task folder
- /Any other folder, not task related

**範例2: 簡化部分 UI （省略 new chat button, task.json, etc...），聚焦在 task 間的執行、串連**

/(Workspace) Develop a startup app

- /(task) [Run Button] commit event channel code
- /(task) [Run Button] 對 event channel code 寫測試
- /(task) [Run Button] 依照設計實作 event channel code
- /(task) [Run Button] 參考討論串重新設計 event channel
  - (entrypoint) chat*01*{timestamp}.json // Prompt: 「參考 #artifact\_討論串整理.md重新設計 event channel」，引用上一個 task 的 artifact 作為 input
  - artifact\_設計.v{timestamp}.md // 用 “artifact” 代表AI生成的結果
- /(task) [Run Button] Events 在前後端傳輸時碰到 websocket 斷連情況要如何做
  - (entrypoint) chat*01*{timestamp}.json // Prompt: 「events 在前後端傳輸時碰到 websocket 斷連情況要如何做？」
  - artifact\_討論串整理.v{timestamp}.md // 用 “artifact” 代表AI生成的結果

### 點擊`chat.json`後？

1. 用戶在workspace explorer上點擊 `chat.json` file
2. 中間欄開啟chat panel，顯示對話紀錄，底下有個輸入，可以繼續與AI對話

###點擊[New Chat]後？

1. chat panel 開新 chat
2. 用戶輸入 prompt & 送出後，若沒有點選 new task，就是創一個新的 chat.json，反之就是創新的 task folder，包含當前的這個chat

### Chat file 命名？

chat\_{id_or_title}.{timestamp}.json

1. 以 “chat\*.json” 判斷是否為 chat
2. ID 或 title，一個是簡單命名 vs 較有意義的命名，或是可以兩者結合（id+title)，就看用戶喜好...
3. Timestamp 為創建的時間戳，用於 version control，判斷哪個是最新版本

### 要稱作 workspace 還是 project？（尚未決定）

目前還沒定論，但我覺得這可以是丟出去後看反饋

### 定義 Task？

1. Workspace是一個 folder， task 也是一個 folder。每個 task folder裡會有一個 task.json，也是利用`task.json`來判斷這個 folder是不是一個 task。
2. 因為是用 folder 的形式，很自然的，在一個 project folder 裡，可以有多個 task folders，一個 task folder 裡也可以有多個 task folders (稱為 subtasks)。
3. Task 中包含有: chat files, task.json

### Task 與 claude project 的差異？

- Task <-> Claude project
- Task files <-> Claude project files
- Task chats <-> Claude project chats
- Task's subtasks <-> Claude 沒有
- Run a task <-> Claude 沒有

### Run task chain？

參考前面 Develop a startup app 的例子，當 tasks 依賴於前面 task output ，就自然形成了一個dependency run graph。基於 run graph，跑完 task 後可建議用戶使否要繼續跑下個 task，或是乾脆能選擇直接無腦執行 run graph？

但因為是 MVP 階段，我覺得可以先 naive 一點，就是完全不管 run graph，用戶跑哪個就是哪個，不會自動跑下個。

### Run tasks under /task？

/task 1

- /task 2
- /task 3

Naive 的做法是直接按 folder 排序依序跑底下的 tasks（task2 -> task3)。

Fancy 的做法是基於 run graph，MVP階段不考慮。

### 如果 /task 底下同時有 chat.json ＆ /task 該怎樣跑？

/task 1

- /task 2
- /task 3
- chat.json

Naive做法：先跑parent，再跑 children，例如task1 -> task 3 -> task 3

### 如何管理 task knowledge？

**方案1**：有一個 /task_knowledge folder，裡面的檔案就會視為 task knowledge，這些檔案會自動被注入到
/task

- /task_knowledge
  - a.py, b.py
  - task_instruction.md

**方案2**：直接用 UI 方式來顯示、控制哪些是被放入 knowldege 的，
/task

- /task_knowledge
  - a.py, b.py
  - task_instruction.md

### 如果我需要的檔案存在於外部？

在 prompt 中用 #檔案路徑 的寫法注入

### 我有時候會需要更動 knowledge files，但又不想要來回反覆操作 knowledge？

用 #檔案路徑 的寫法注入時，可以透過 copy/paste 的方式快速調整 prompt，例如：
Chat 1v1：「#a.py #…/event/test 請參考 tests，為某class 寫 test」
Chat 1v2：「#a.py #b.py #…/event/test 請參考 tests，為某class 寫 test」
Chat 2：「#a.py #b.py #…/event/test …」

### 既然都有了檔案注入寫法，那knowledge幹嘛不直接注入就好了？

好像可以！
可以預設是將 task folder （不包含子階層） 的 files 全部納入到 <task_knowledge>，透過 XML 的方式讓用戶可以自行去修改、調整。
Task knowledge 也會記錄在 task.json 中，當用戶在 prompt 中調整 task knowledge，則更新（？）

例如Prompt

```
<task_knowledge>
#p1.jpg #p2.jpg
#*.jpg (或乾脆直接用 wild card）
</task_knowledge>

<task_instruction> … </task_instruction>

請對 p1.jpg 做 OCR
```

### Chat panel - User input box UI設計？

(Text Input Box)
--------------------------------------------------|
|
|
|  
--------------------------------------------------|
[Agent] [New Task] [Claude 3.7] [Submit]

說明：

- [Agent], [New Task]：selectable button，其實是 radio，有selected、unselect兩種狀態
- [Agent] ：使用 agent
- [New Task]：用戶輸入 prompt ＆ 送出後，會創新的task folder, 包含 task.json, chat.json (當前的這個chat)

### 定義 Chat

Chat 就是讓用戶與 AI 對話，可以選擇希望使用的 model。基本上就是 AI 與用戶之間的問答，可選功能像是Agent、Web search、...。
一個 Chat中也包含 function calling，所以可以是user -> agent (call function) -> system (function run result) -> agent (generate response) -> user -> …

### 有哪些對話模式？

1. 基本 rotation 模式：user -> ai -> user …
2. Agent 模式（MVP初期不考慮）：user (初始任務） -> （ ai (planner) -> ai (action) -> system -> ） 循環直到觸發終止條件（agent 判斷任務完成、maximum budge, iteration）
3. Group chat 模式（MVP不考慮）：user -> ai 1 -> ai 2 -> ai 3 -> user … （其實還是 rotate 的一種）

### 為什麼一個 task 要有多個 chats？

Chat 可以是任務本身，也可以是純粹是問與答，與任務相關，但不直接涉及到任務本身。
例如寫一個外文的回覆 email，當 ai 生成的 email 中有些用字有疑問時，可能想單獨開一個對話問 AI ，這時候開在同一個 task 裡面是最為適合，但

### 那如果有多個 chats，在 run task 時也要依序被執行嗎？

Naive 的做法是不分青紅皂白，就是依序跑每個 chats，類似 run tasks under task。
比較好的做法可能是讓使用者決定需要執行的 chats ＆ 執行順序，畢竟有很多 chats 可能根本不涉及到任務本身，不該被執行。
原則上應該是一個 task 對應一個任務 chat，執行後產生 output，然後跑下一個 task 。

### 什麼情況下會需要一個 task 下有多個需要依序執行的 chats（chat chain）？

例如：「對掃描檔做 OCR」
Chat 1: 對 p1.jpg 做OCR
-> Chat 2: 對 p2jpg 做OCR
-> Chat 3: 對 p3.jpg 做OCR

例如：「請按照design 寫 code」
Chat 1: 現在已經完成：(empty)，請寫：code1
-> Chat 2: 現在已經完成：code1，請寫：code2
-> Chat 3: 現在已經完成：code1, code2，請寫：code3

### 假設任務為「對掃描檔做 OCR」，如何做的自動化一點？

全自動的做法：使用agent
例如：用戶 「對掃描檔做 OCR (開啟 agent)」 -> AI analyze, deliver plan, run in loop, output file

半自動做法：

1. [下一步] ：用戶「對 p1.jpg 做OCR」 -> AI 產出結果 -> 用戶點 [下一步] -> AI 自動生成下個 task -> 用戶點「run task」
2. AI 建議 prompt（MVP初期不考慮）：用戶「對 p1.jpg 做OCR」 -> … -> 用戶點 [new chat] -> 輸入prompt時，AI 提示輸入「對 p2.jpg 做OCR」
3. AI 建議 prompts（MVP不考慮）：用戶「對 p1.jpg 做OCR」 -> … -> 用戶點 [new chat] ->輸入prompt時，AI 提示輸入「對 p2.jpg 做OCR （command: new chat: 對 p3.jpg 做OCR） （command: new chat: 對 p4.jpg 做OCR）」
