```
請參考 `design-ux-flow_ocr-and-translate-v1.md`，編寫一個新的 UX 流程
Task：宣傳我正在開發的新遊戲

* 可能需要多個任務，適當的拆分任務
* 流程可適度簡化、省略
* 流程要清晰易懂，方便讓其他開發者閱讀
* 主要目的就是在展示這個 app 可以怎麼幫助目標用戶，解決用戶通點
* 流程格式可以自己定義，不用照原本的，目標是清晰易懂，方便閱讀
```

# UX 流程設計 - 宣傳正在開發的新遊戲

## 概述

此流程展示如何使用 AI 輔助工作流程應用程式來協助遊戲開發者規劃並執行宣傳活動。流程中展示了系統的不同功能，包括手動模式、「下一步」功能以及知識引用等。

## 1. 建立宣傳計畫 (使用手動模式 + 下一步功能)

### 開始任務：分析目標受眾與平台

使用者在主頁點擊「+ 新聊天」，彈出 modal

- 使用者保持預設設定 (chat mode、勾選創建新任務)
- 輸入 prompt：「我正在開發一款名為『星際定居者』的太空建設與探索遊戲，請幫我分析適合的目標受眾與宣傳平台」並送出
- 系統創建新任務資料夾「宣傳新遊戲」，包含第一個 chat 檔案
- AI 回應分析結果
- 使用者點擊「⚙️ 儲存為文件」功能，將 AI 回應保存為「target_audience_analysis.md」

### 使用「下一步」功能繼續工作流程

- 使用者點擊「下一步 ▶️✨」按鈕
- 系統彈出「下一步」modal，顯示 AI 建議：「制定宣傳時間線與關鍵里程碑」
- 使用者確認並送出
- 系統開啟新 chat，已填入 prompt：「#target_audience_analysis.md 基於目標受眾分析，請幫我制定『星際定居者』遊戲的宣傳時間線與關鍵里程碑，從現在開始到正式發布」
- AI 回應時間線規劃
- 使用者儲存為「promotion_timeline.md」

## 2. 創建宣傳素材 (使用子任務 + 檔案引用)

### 建立子任務：社交媒體內容

使用者點擊「下一步 ▶️✨」按鈕

- 系統顯示建議：「創建社交媒體宣傳內容計畫」
- 使用者編輯 modal 中的 prompt：

  ```
  <task_knowledge>
  #target_audience_analysis.md #promotion_timeline.md
  </task_knowledge>

  請為『星際定居者』遊戲制定社交媒體宣傳計畫，包括:
  1. 每週發布頻率建議
  2. 內容類型 (遊戲截圖、開發日誌、角色介紹等)
  3. 針對不同平台的內容調整策略
  ```

- 使用者選擇「Create New Task ✓」選項，指示系統創建子任務
- 系統創建子任務「社交媒體內容」，開啟新 chat
- AI 回應社交媒體計畫
- 使用者儲存為「social_media_plan.md」

### 繼續子任務：創建示範貼文

- 使用者在同一子任務中開新 chat
- 輸入 prompt：「#social_media_plan.md 請根據社交媒體計畫，為第一週的 Twitter 和 Instagram 各創建 3 則示範貼文」
- AI 提供示範貼文
- 使用者將 AI 回應儲存為「week1_social_posts.md」

## 3. 建立遊戲預告片腳本 (使用 task knowledge 引用 + 下一步功能)

使用者回到主任務，點擊「下一步 ▶️✨」

- 系統建議：「撰寫遊戲預告片腳本」
- 使用者上傳遊戲截圖檔案「screenshot1.jpg」、「screenshot2.jpg」、「gameplay.mp4」
- 使用者編輯 prompt：

  ```
  <task_knowledge>
  #target_audience_analysis.md #promotion_timeline.md
  #screenshot1.jpg #screenshot2.jpg #gameplay.mp4
  </task_knowledge>

  請根據上傳的遊戲畫面與目標受眾分析，為『星際定居者』遊戲創建一個 90 秒的預告片腳本，強調遊戲的太空探索與建設元素
  ```

- 系統創建新 chat
- AI 提供預告片腳本
- 使用者編輯腳本並儲存為「trailer_script.md」

## 4. 使用 Agent 模式規劃發布活動

使用者點擊「下一步 ▶️✨」

- 系統建議：「規劃遊戲發布活動」
- 使用者切換至「Agent」模式
- 使用者輸入 prompt：

  ```
  <task_knowledge>
  #target_audience_analysis.md #promotion_timeline.md
  #social_media_plan.md #trailer_script.md
  </task_knowledge>

  請為『星際定居者』規劃一個完整的發布活動，包括:
  - 在線發布會細節
  - 早期體驗版發放策略
  - 與網絡內容創作者的合作方案
  - 發布日活動
  ```

- 系統創建新 chat (agent mode)

### Agent 模式開始

- AI 分析資料並規劃發布活動
- AI：對發布活動進行規劃 <工作規劃>計畫：分析現有資料，制定發布活動細節... 目前進度：0%</工作規劃>
- AI：創建在線發布會計畫 <工作規劃>進度：25%</工作規劃>
- AI：設計早期體驗版發放策略 <工作規劃>進度：50%</工作規劃>
- AI：制定內容創作者合作方案 <工作規劃>進度：75%</工作規劃>
- AI：計劃發布日活動 <工作規劃>進度：100%</工作規劃>
- AI：將所有計畫整合到「launch_event_plan.md」(function call)
- 系統：function call result: file `launch_event_plan.md` created
- AI：判斷工作已完成，提供發布活動計畫總結
- 系統：task 結束執行

## 5. 總結宣傳計畫 (使用 Summarize 功能)

使用者點擊「Summarize ✨」按鈕

- AI 分析所有已創建的文件
- AI 生成宣傳計畫總結，包含所有關鍵決策和下一步行動項目
- 系統：「已將摘要儲存為: [game_promotion_summary.md]」

使用者檢視摘要文件，獲得完整的遊戲宣傳計畫概覽，包括:

- 目標受眾分析
- 宣傳時間線
- 社交媒體策略
- 預告片計畫
- 發布活動詳情
- 後續行動項目

## 使用者體驗亮點

1. **問題解決**：解決了遊戲開發者需要在多個平台分散精力規劃宣傳的痛點
2. **「Push not pull」**：系統主動建議下一步行動，減輕使用者認知負擔
3. **知識累積**：前一步的成果自動成為下一步的知識輸入
4. **任務分解**：將大型宣傳計畫自然拆分為可管理的子任務
5. **靈活性**：使用者可以在手動、半自動與全自動模式間切換，滿足不同需求

這個流程展示了如何利用系統功能來協助遊戲開發者高效規劃和執行宣傳活動，大幅減少了從概念到實施的時間與精力成本。

# 宣傳新遊戲 - 最終 Workspace 結構

```
/(Workspace) 宣傳新遊戲
├── /(task) 宣傳新遊戲
│   ├── (entrypoint) chat_goal_audience.v1.json  // 第一個聊天：分析目標受眾
│   ├── chat_timeline.v1.json                    // 第二個聊天：宣傳時間線
│   ├── chat_trailer.v1.json                     // 第四個聊天：預告片腳本
│   ├── chat_launch_event.v1.json (agent mode)   // 第五個聊天：發布活動規劃
│   ├── target_audience_analysis.md              // 分析結果檔案
│   ├── promotion_timeline.md                    // 時間線規劃檔案
│   ├── trailer_script.md                        // 預告片腳本檔案
│   ├── launch_event_plan.md                     // 發布活動計畫檔案
│   ├── game_promotion_summary.md                // Summarize功能產生的總結
│   ├── screenshot1.jpg                          // 上傳的遊戲截圖
│   ├── screenshot2.jpg                          // 上傳的遊戲截圖
│   ├── gameplay.mp4                             // 上傳的遊戲影片
│   │
│   └── /(subtask) 社交媒體內容
│       ├── (entrypoint) chat_social_plan.v1.json  // 子任務第一個聊天：社交媒體計畫
│       ├── chat_demo_posts.v1.json                // 子任務第二個聊天：示範貼文
│       ├── social_media_plan.md                   // 社交媒體計畫檔案
│       └── week1_social_posts.md                  // 第一週貼文範例檔案
│
└── task.json  // 任務定義檔案
```

這個結構清晰地展示了整個工作流程的組織方式：

- 主任務「宣傳新遊戲」包含所有重要的聊天和產出文件
- 子任務「社交媒體內容」專注於特定宣傳領域
- 各個聊天記錄都有明確的命名和版本標記
- 所有資源（文件、圖片、影片）都組織在適當的位置
- 最終摘要文件清晰可見，方便快速掌握整個宣傳計畫

這種結構使團隊成員可以輕鬆理解整個宣傳活動的進展，並在未來可以重複使用成功的工作流程模板。
