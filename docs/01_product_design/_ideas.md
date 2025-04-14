# 思考＆討論

Task 的 scope？也就是說，我們應該要把什麼定義成一個 task？

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

想想 tasks 的連接性

- 若新 task 是基於前一個 task 的成果、討論、...等等，則可以假設這兩個 tasks 是相關聯的，透過串連，我們可以這樣寫(as tree)： t1 -> t2 -> t3 -> t5, t6 ...

那tasks串連可以幹嘛？

- 可以修改某個節點 & 執行 -> 這樣就可以一併驅動後面的節點重跑
- Clone 某個 task 後，我們可以基於先前的 task chain，來知道後續 tasks，方便一併 clone & 跑

跳出來想一下Task 的重跑機制

- 假設 task 是依賴於某個 file，例如 events-design.md ，當 file 更新時，是不是也就暗示著依賴這個 file 的 task(s) 需要重跑？
  - 我覺得是可以作為提示，但不是必要，畢竟也不是每次更新使用者都希望重跑，甚至有很多東西已經改變了

Multi tasks 要如何管理？

- Workspace/task/task/…
  - 允許 task 下創 task
  - 每個folder底下只要有 task.json 就識別為 task
  - Task (run)/task (run)
- Project/task

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

Case:翻譯書本掃描檔

1. 最懶的作法(全自動)

Prompt：對這本書的圖檔做 OCR & 翻譯
-> [start]

- 全自動、完全agent
- 搜尋類似的 tasks、嘗試利用以往的 prompts
- 或許也可以搜尋網上類似的flows
- 也不是不行，可以先試跑後再來修改

2. 手動一點(半自動)

task 1: 對 p1.jpg 做OCR <輸出範本> <注意事項>

-> (手動調整輸出，建立`輸出範本.md`，`注意事項.md`等等)

-> (new chat) 對 p2.jpg 做OCR #輸出範本.md #注意事項.md
-> (new chat) 對 p3.jpg 做OCR #輸出範本.md #注意事項.md
-> (new chat) (AI建議prompt)

(更方便的做法）
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

Case: events設計、開發

開發流程：需求、問題 -> 討論 approaches -> design -> implement -> test -> commit

使用者: 我想要做這樣的一個東西、我有一個問題、...
-> ai 建議 & 討論

-> 使用者：ok，就照這個做
->

- 方案1: 無視，繼續在同一個對話下執行
  - 最 naive 的做法，雖然是最為直覺，但在同一個對話下做效果會不好
- 方案2: 不跑＆建議開新工作？
- 方案1+2: 直接跑＆建議開新工作？
- 方案3：介面>開新工作，仰賴使用者主動
  - 例如提供一個按鈕 or quote [以此開新工作] -> prompt：<引用> … -> 跑新工作
  - 比較容易實作，可以先從這個開始？
- 方案4：prompt 提示：將討論整理成重點＆輸出成<....>？

-> 使用者：ok，我覺得方案X不錯，請整理上述討論＆輸出<討論重點>
-> AI：輸出<討論重點>
-> AI：建議

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
