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

# 倉庫（可能已經被淘汰）

### Task 的 scope？也就是說，我們應該要把什麼定義成一個 task？

- 我覺得是一個小目標 = 一個 task，有一個或多個輸出、成果
- 例如：
  - 討論問題的解法 -> 輸出討論結果
  - 基於討論，設計 interfaces -> interfaces
  - 基於 interface，implement -> codes
  - 基於 codes，for each code, write test & run -> tests
  - Summarize & commit -> commit log
- 例如：deep research
  - 基於 prompt -> 產生 keywords
  - Run search -> collect results （重複 until satisfied with the result） -> search results
  - Summarize results
  - 基於討論，research again
  - （repeat）

### 想想 tasks 的連接性

- 若新 task 是基於前一個 task 的成果、討論、...等等，則可以假設這兩個 tasks 是相關聯的，透過串連，我們可以這樣寫(as tree)： t1 -> t2 -> t3 -> t5, t6 ...

### 那tasks串連可以幹嘛？

- 可以修改某個節點 & 執行 -> 這樣就可以一併驅動後面的節點重跑
- Clone 某個 task 後，我們可以基於先前的 task chain，來知道後續 tasks，方便一併 clone & 跑

### 跳出來想一下Task 的重跑機制

- 假設 task 是依賴於某個 file，例如 events-design.md ，當 file 更新時，是不是也就暗示著依賴這個 file 的 task(s) 需要重跑？
  - 我覺得是可以作為提示，但不是必要，畢竟也不是每次更新使用者都希望重跑，甚至有很多東西已經改變了

### Multi tasks 要如何管理？

### Approach 1: Workspace/task/task/…

- 允許 task 下創 task
- 每個folder底下只要有 task.json 就識別為 task
- Task (run all)/task (run)

=>

- 問題
  - task階層限制？ -> 無，讓使用者來自行決定
  - `workspace/task1/output.md`

Approach 2: Project/task

**…/Task 寫公文 [run] [clone] […]**

- [new chat] [new task]
- Chat\_寫一篇公文.v1.json [run] [clone] […]
  - {branch_from: …, files: {“#aaa..md”, “workspace/…/…/…”}, output: [“…”]}
- Chat\_寫一篇公文.v2.json
- Chat\_寫一篇公文.v3.json
- Chat\_問問題.v1.json
  - {parent: null, …} -> 與其他chat沒有關聯
- Task.json
  - {entrypoint: “....”, }
- Artifact\_公文.v1.txt

**…/Task 翻譯網頁＆寫公文 [run] […]**

- Chat\_翻譯網頁＆寫公文.v1.json [run] [clone] […]

```
# 多個 chat（對話） 可以整合在一個 chat jsonUser:
<目標> 瀏覽以下網址 ＆...
https://….
<注意事項>
<輸出範本>

Function: Browse the site URL: …
Function: HTML to MD
Function: Output MD

AI: 翻譯、生成公文...
```

**Workspace: some-event-system**

- …/doc
  - /events-design.md
- …/code

  - /events
  - /event_bus.py

- …/Task\_開發events系統

  - Task\_更新events_2?

  - Task\_更新events

  - …

  - Task_implement events

  - Task\_設計events
    - artifact_events_design.v10.md
  - 開發目標、流程.md
    - <目標>
    - <流程>
    - …

- …/Task\_更新events => clone 開發events系統？

  - Task_implement events
  - Task\_設計events
    - artifact_events_design.v15.md

- …/Task\_重新命名 events

  - Task\_重新命名 events

  - Task\_更新 codes

  - Task\_跑測試
  - Task_commit

### 帶入情境來思考產品如何設計

#### Case:翻譯書本掃描檔

1. 最懶的作法(全自動)

Prompt：對這本書的圖檔做 OCR & 翻譯
-> [start]

- 全自動、完全agent
- 搜尋類似的 tasks、嘗試利用以往的 prompts
- 或許也可以搜尋網上類似的flows
- 也不是不行，可以先試跑後再來修改

2. 手動一點(半自動)

task 1:
Prompt: 對 p1.jpg 做OCR <輸出範本> <注意事項>

-> (手動調整輸出，建立`輸出範本.md`，`注意事項.md`等等)

-> (new chat) 對 p2.jpg 做OCR #輸出範本.md #注意事項.md
-> (new chat) 對 p3.jpg 做OCR #輸出範本.md #注意事項.md
-> (new chat) (AI建議prompt)

(更方便的做法)
-> AI直接建議接下來prompts、駐列執行，例如
(new chat) 對 p4.jpg 做OCR #輸出範本.md #注意事項.md
(new chat) 對 p5.jpg 做OCR #輸出範本.md #注意事項.md
(new chat) 對 p5.jpg 做OCR #輸出範本.md #注意事項.md
…

-> 使用者確認後，就開始駐列執行，這樣也更省事吧（？）

task 2: 請將 p1.txt 翻譯成繁體中文 <輸出範本> <注意事項>
-> …

3. 利用既有的task，跑一個新task，例如翻譯新的書

複製資料夾、把掃描檔換成新的 -> 執行

#### Case: events設計、開發

開發流程：需求、問題 -> 討論 approaches -> design -> implement -> test -> commit

使用者: 我想要做這樣的一個東西、我有一個問題、...
-> ai 建議 & 討論

-> 使用者："ok，就照這個做"
->

- 方案1: 繼續在同一個對話下執行
  - 最 naive 的做法，雖然是最為直覺，但在同一個對話下做效果會不好
- 方案2: 不跑＆建議開新工作？
- 方案1+2: 直接跑＆建議開新工作？
- 方案3：介面>開新工作，仰賴使用者主動

  - 例如提供一個按鈕 or quote [以此開新工作] -> prompt：<引用> … -> 跑新工作
  - 比較容易實作，可以先從這個開始？

- 方案4：prompt 提示：將討論整理成重點＆輸出成<....>？

-> 使用者：ok，我覺得方案X不錯，請整理上述討論＆輸出<討論重點>
-> AI：輸出<討論重點>
-> AI：建議啟動 next task：按照 <討論重點> implement code [approve]

1. next task：按照 <討論重點> 實作code
2. next tasks 駐列：使用 <code開發基本流程>
   1. Task: 按照 <討論重點> 實作code
   2. Task: 寫測試 ＆ run & fix, repeat until passed (max iteration = 10)
   3. Task: Commit

（新task）目標：按照<討論重點>寫 code… <步驟> <注意事項> <…>
-> （new chat）目標：按照<討論重點>寫 code… <步驟> <注意事項> <…>
目前已完成：<a.py> <b.py> …
請實作：...

-> (repeat chats until done)
->

1. 無駐列：ai 根據現況，建議 next task
2. 有駐列：
   1. 比較 naive 的做法：直接跑下個 task
   2. 更為靈活的做法：ai 根據現況，判斷是否更新駐列 & auto run next task

～去開發別的東西，久久之後，需要更新 events～

這時候要如何做比較方便？

1. 不管以前怎樣，總之就是新 task
2. Clone events design task -> 修改 prompt -> run
3. 直接在原本的 events design task -> 修改 prompt -> run
   1. 這個不會創新 folder，只會創新 chat
   2. 雖然後續 tasks 可以透過原 task

-> ai 判斷工作完成，建議 next task: implement events

是開新 task 還是 chat？

- 假設原則是一工作一 task，那 chat 會是在什麼時候用到？
  - 一個工作可能會需要多個 chat 來完成，例如每次就是從新對話開始（->消除不必要的前面記憶）
- 若工作還沒結束，使用者判定是[新對話]可以解決的，他就直接點[新對話]不就好了？
- 若使用者 or AI 判斷這個工作結束，則才去點[next task]

### 曾經想的，可能已經淘汰

要允許 chat 可以獨立於 subtask 嗎，也就是 task-wide chats？

- 在哪種情況下會有這種需求？
  - 情況：想問跟這個 task 有關（需要引用一些檔案等等），但不屬於 subtask 的問題
    -> 感覺可以有，但是如果是 task 有關，一般來講更會像是 planning 的東西，這個目前就存在 step 0 中
  - 情況：跟這個 subtask 有關，但沒有打算輸出時，純粹問問題，確認東西？
    -> 開 chat & 不輸出（approve）就好
    => 待討論

# 需求

💬
幫我去跟這個購物中心的管理者抱怨，這個店家播放的音樂太大聲，而且不停循環

1. 造成我無法聽到原本所在店家的音樂、嚴重干擾我的權益
2. 播放的音樂可能沒有獲得授權

日期時間：...
<錄音檔> <地址、店家、照片>

### 實際開發時碰到的問題 & 方案

🤔💭
我在開發 event system 時，針對 event handler 是否要採 generic，經過多輪 ai 對話，決定是採一個替代方案。\
後來繼續去做別的東西，回過頭來要重寫 event system時就完全忘了這個方案（包含 code）存在哪了，要找有點困難\
=> 對策：

1. 將目前的一些問題、結論、成果給「紀錄、筆記」下來，免得到了後面忙別的，回來又找不到
2. 很多時候，紀錄「問題」歷程比「解法」更重要，因為問題是我當時的思緒
3. Search across multiple chats？（例如在這個 folder 下搜尋 chats）

🤔💭
我在開發時習慣就是不停開 chat。通常是針對一個問題，因為需要先「清空」前面的討論，或是基於當前成果繼續問其他方向的問題。\
而不停開新 chat 的問題就是因為 chats 與 chats 間沒有 grouping，所以要回顧那一堆 chats 時我也很難找我想要的資訊。\
這問題跟前一個很像，都是因為一堆 chats 在沒有整理的情況很難被回顧使用，一個好的紀錄點是一個值得的功能。但我也同意這不是什麼非必要的功能。
=>

1. 人很懶，我可能已經跳主題了，但我還是在同一個分類項目底下 -> 有沒有可能在當發覺這分類可以另開主題時，提醒用戶＆後續自動化？

🤔💭
開發與 git commit 做結合，例如用 ai 對一個 feature、bug 開發完成後，可以自動跑 test & 由 AI 把關聯的東西包起來 & commit，ai 幫忙寫 commit log
=> 無腦式開發，這樣也有好的開發過程紀錄

🤔💭
開發過程中我想到：「當 websocket 斷連時，這時候客戶端會收不到 server events，一般前端會怎樣處理這種情形？」
隨手開了一個新 chat，AI 提供了些方向
但當前要先弄當下的todo，這個feature暫時無法顧到，但我又想把他列為個 todo，未來才回來弄
=> 提供以此 chat 開城新的 task 的功能 ，然後放置 task？未來有空再回來

🤔💭
在開發的聊天群組中與同事討論一些新idea，但這些隨手拋出的idea&討論還需要我自己整理、放到開發文件中
=> 放一個 ai bot 在這個聊天群，bot自己分析、判斷這段討論是否適合整理起來，加入到開發文件中

### UI/UX 實用功能

- 在 chat 中的 agent message，允許：

  - 用不同的 LLM 重跑
  - 把 prompt 翻成英文後重跑（基於一般的 LLM 對於英文發揮較好）

- User inputbox

  - 用戶可以選擇 "enter" or "shift + enter" to submit

- Prompt congtext 快速注入

- Current file，除非有"select texted"，不然就是注入整個file

- 將 prompt 想成類似編輯文檔，thread 上的 prompts 全部放一起 、ai auto complete

- 當某個分支調整產出新的 output 時，可以自動 trigger 後續 worksflow 重跑

  - 例如：
    Workflow: 設計圖 -> component naming -> 設計圖＋component naming -> event-types.ts -> ...
    - 當調整 component naming -> 後面一系列的 output 都需要基於新的 naming 更新
      - 當然似乎也可以直接給新 prompts，而不是重跑整個 workflow（太過耗成本） => 這個應該可以留給 ai 做自動化判斷

- app 待機時顯示 dashboard modal（精簡版？） -> 方便讓 user 了解當前的執行進度（？）
  - 想像是 cnyes.com 這種
