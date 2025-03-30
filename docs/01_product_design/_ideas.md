# 討論

要允許 chat 可以獨立於 subtask 嗎，也就是 task-wide chats？

- 在哪種情況下會有這種需求？
  - 情況：想問跟這個 task 有關（需要引用一些檔案等等），但不屬於 subtask 的問題
    -> 感覺可以有，但是如果是 task 有關，一般來講更會像是 planning 的東西，這個目前就存在 step 0 中
  - 情況：跟這個 subtask 有關，但沒有打算輸出時，純粹問問題，確認東西？
    -> 開 chat & 不輸出（approve）就好
    => 待討論

# 實際開發時碰到的問題 & 方案

我在開發 event system 時，針對 event handler 是否要採 generic，經過多輪 ai 對話，決定是採一個替代方案。\
後來繼續去做別的東西，回過頭來要重寫 event system時就完全忘了這個方案（包含 code）存在哪了，要找有點困難\
=> 對策：

1. 將目前的一些問題、結論、成果給「紀錄、筆記」下來，免得到了後面忙別的，回來又找不到
2. 很多時候，紀錄「問題」歷程比「解法」更重要，因為問題是我當時的思緒
3. Search across multiple chats？（例如在這個 folder 下搜尋 chats）

我在開發時習慣就是不停開 chat。通常是針對一個問題，因為需要先「清空」前面的討論，或是基於當前成果繼續問其他方向的問題。\
而不停開新 chat 的問題就是因為 chats 與 chats 間沒有 grouping，所以要回顧那一堆 chats 時我也很難找我想要的資訊。\
這問題跟前一個很像，都是因為一堆 chats 在沒有整理的情況很難被回顧使用，一個好的紀錄點是一個值得的功能。但我也同意這不是什麼非必要的功能。
=>

1. 人很懶，我可能已經跳主題了，但我還是在同一個分類項目底下 -> 有沒有可能在當發覺這分類可以另開主題時，提醒用戶＆後續自動化？

# UI/UX 實用功能

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
