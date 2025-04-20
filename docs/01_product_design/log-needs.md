# 日常碰到的問題、需求 Daily problems, needs

🤔💭
幫我去跟這個購物中心的管理者抱怨，這個店家播放的音樂太大聲，而且不停循環

1. 造成我無法聽到原本所在店家的音樂、嚴重干擾我的權益
2. 播放的音樂可能沒有獲得授權

日期時間：...
<錄音檔> <地址、店家、照片>

## 程式開發需求 Code development needs

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

# Feature requests

🙋‍♂️
在 chat 中的 agent message，允許：

- 用不同的 LLM 重跑
- 把 prompt 翻成英文後重跑（基於一般的 LLM 對於英文發揮較好）

🙋‍♂️
User inputbox: 用戶可以選擇 "enter" or "shift + enter" to submit

🙋‍♂️
Prompt congtext 快速注入

🙋‍♂️
Current file，除非有"select texted"，不然就是注入整個file

🙋‍♂️
將 prompt 想成類似編輯文檔，thread 上的 prompts 全部放一起 、ai auto complete

🙋‍♂️
當某個分支調整產出新的 output 時，可以自動 trigger 後續 worksflow 重跑
例如：Workflow: 設計圖 -> component naming -> 設計圖＋component naming -> event-types.ts -> ...

🙋‍♂️
當調整 component naming -> 後面一系列的 output 都需要基於新的 naming 更新

- 當然似乎也可以直接給新 prompts，而不是重跑整個 workflow（太過耗成本） => 這個應該可以留給 ai 做自動化判斷

🙋‍♂️
app 待機時顯示 dashboard modal（精簡版？） -> 方便讓 user 了解當前的執行進度（？）

- 想像是 cnyes.com 這種

🙋‍♂️🙋‍♂️
用 Playwright 這類工具控制 browser，橋接 claude, chatgpt 的 WEB 介面，讓原本就有訂閱服務的人不用另外在透過API來使用這個app

🙋‍♂️🙋‍♂️
Prompt 快捷鍵：使用者透過快捷引用、輸入，來增加 prompt 的編輯性

- 方向鍵上下：切換先前 prompt
- '@' to mention: 參考 CursorIDE 作法，開啟 Omnibox（做 search 或是 select menu）
  - 單一 entry，無腦但絕對方便，menu 允許增加各種附加功能，search 允許使用者快速增加常用的東西
  - Cline 應該有做類似的功能 -> 可參考 code
  - Menu
  - 參考 cursor
  - (plus) 常用 prompt
- Paste URL as context
  - 可詢問是否要 fetch URL & context?
