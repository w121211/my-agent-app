```
請參考 app 設計, UI, UX設計，編寫一個新的 UX 流程
Task：宣傳我正在開發的新遊戲

- 可能需要多個任務，適當的拆分任務
- 基於拆分任務，請先規劃、描述最終的 workspace structure tree
- 流程可適度簡化、省略
- 流程要清晰易懂，方便讓其他開發者閱讀
- 主要目的就是在展示這個 app 可以怎麼幫助目標用戶，解決用戶通點
- 流程格式可以自己定義，不用照原本的，目標是清晰易懂，方便閱讀
```

好的，這是一個針對「宣傳新遊戲」任務，基於您提供的 App 設計理念和 UI/UX 文件所規劃的新 UX 流程。

## 核心目標

此流程旨在展示您的 AI 輔助工作流程 App 如何幫助遊戲開發者（特別是資源有限的獨立開發者或小團隊）解決**缺乏時間/專業知識進行有效遊戲宣傳**的痛點。透過 AI 的輔助和「下一步」的推動 (Push not Pull)，簡化並自動化部分宣傳任務，讓開發者能更專注於遊戲本身，同時確保宣傳工作持續進行。

## 最終 Workspace Structure Tree 規劃

以下是針對「宣傳新遊戲」這個大型任務的 Workspace 結構範例：

```
/(Workspace) [我的新遊戲名稱] 上市宣傳活動
│
├── /(task) 01-宣傳策略與目標設定 [Run Button] ✓
│   ├── (entrypoint) chat_strategy_v1.json  // Prompt: "分析 #game_pitch.txt，建議適合的上市宣傳策略、目標受眾與關鍵訊息"
│   ├── artifact_strategy_plan_v1.md      // AI 產出的策略建議
│   └── artifact_target_audience_v1.md    // AI 產出的目標受眾分析
│
├── /(task) 02-核心宣傳文案撰寫 [Run Button] 🏃 (1/3)
│   ├── (entrypoint) chat_core_copy_v1.json // Prompt: "根據 #../01-宣傳策略與目標設定/artifact_strategy_plan_v1.md，撰寫 3 種不同風格的核心宣傳標語與簡介"
│   ├── artifact_copy_option_A_v1.txt
│   ├── artifact_copy_option_B_v1.txt
│   └── artifact_copy_option_C_v1.txt
│
├── /(task) 03-社群媒體內容生成 - 預告期 [Run Button] ▶️
│   ├── (entrypoint) chat_social_teaser_v1.json // Prompt: "使用 #../02-核心宣傳文案撰寫/artifact_copy_option_A_v1.txt 和 #game_assets/screenshot1.jpg，生成 5 則用於遊戲預告期的社群貼文 (Twitter, Facebook)"
│   ├── /game_assets/                      // 存放遊戲圖片、影片等素材
│   │   ├── screenshot1.jpg
│   │   └── concept_art_01.png
│   ├── artifact_social_post_teaser_1.txt
│   └── artifact_social_post_teaser_2.txt ...
│
├── /(task) 04-視覺素材概念發想 [Run Button] ▶️
│   ├── (entrypoint) chat_visual_ideas_v1.json // Prompt: "基於 #../02-核心宣傳文案撰寫/artifact_copy_option_B_v1.txt 和 #game_pitch.txt，發想 5 個廣告視覺概念"
│   └── artifact_visual_concepts_v1.md
│
├── /(task) 05-新聞稿草稿撰寫 [Run Button] ▶️
│   ├── (entrypoint) chat_press_release_v1.json // Prompt: "參考 #game_pitch.txt 和 #../01-宣傳策略與目標設定/artifact_target_audience_v1.md，撰寫一份遊戲上市新聞稿草稿"
│   └── artifact_press_release_draft_v1.md
│
├── /(task) 06-社群媒體內容生成 - 上市週 [Run Button] ▶️
│   ├── (entrypoint) chat_social_launch_v1.json // Prompt: "混合使用 #../02-核心宣傳文案撰寫/artifact_copy_*.txt，並搭配 #game_assets/launch_trailer.mp4，生成上市首週的社群貼文計畫"
│   ├── /game_assets/
│   │   └── launch_trailer.mp4
│   └── artifact_launch_week_social_plan_v1.md
│
├── game_pitch.txt                        // 遊戲核心賣點與簡介文件
└── README.md                             // Workspace 說明文件
```

**說明:**

- **Workspace:** 最高層級，代表整個「遊戲宣傳活動」。
- **Task (資料夾):** 代表一個具體的宣傳子任務 (例如：寫文案、做社群貼文)。每個 Task 都有一個 `[Run Button]` 可以重新執行。狀態符號 (`✓`, `🏃`, `▶️`) 表示任務進度。[source: 4, 10, 11]
- **entrypoint chat (.json):** 每個 Task 的起始點，記錄了最初的 Prompt 和相關設定。[source: 49]
- **artifact (.md, .txt, etc.):** AI 生成的產出物，例如文案、策略文件、點子清單。[source: 49]
- **資源文件 (.txt, .jpg, .mp4):** 使用者提供的、用於 AI 分析參考的基礎資料 (遊戲截圖、影片、設計文件等)，透過 `#檔案路徑` 引用。[source: 7, 32, 43, 50]
- **子資料夾 (/game_assets/):** 用於組織相關的資源文件。

## 新 UX 流程：使用「下一步」功能推動宣傳任務 (半自動化)

這個流程側重於展示 App 如何透過 **AI 建議** 和 **「下一步」功能** 來引導使用者完成一系列宣傳任務，解決「不知下一步做什麼」或「懶得開始下一步」的痛點。[source: 48, Q4]

**場景：** 開發者剛完成遊戲的基本介紹文件 (`game_pitch.txt`)，想開始規劃宣傳。

**流程：**

1.  **啟動任務：定義宣傳策略**

    - **使用者操作：**
      - 在 App 主介面 (Explorer) 點擊 `[+ 新聊天]`。[source: 3]
      - 在彈出的「新聊天」Modal 中：
        - 勾選 `[Create New Task]` 選項。[source: 37]
        - 輸入 Task 名稱：「01-宣傳策略與目標設定」。
        - 拖曳或使用 `#` 語法引用 `game_pitch.txt` 作為 `Task Knowledge`。[source: 32-33]
        - 在 Prompt 輸入框寫下指令：「分析 `#game_pitch.txt`，建議適合的上市宣傳策略、目標受眾與關鍵訊息」。[source: 37]
        - 點擊 `[Submit]`。[source: 37]
    - **App 行為：**
      - 創建 `/(task) 01-宣傳策略與目標設定` 資料夾。
      - 儲存 `chat_strategy_v1.json` (包含 Prompt 和 Knowledge 設定)。
      - 執行 Chat，將 Prompt 送給 AI。
    - **AI 行為：**
      - 分析 `game_pitch.txt`。
      - 生成回應，包含策略建議、目標受眾分析等。
    - **App 行為：**
      - 在 Chat 介面顯示 AI 回應。
      - （可選）自動或由使用者手動將 AI 回應中的關鍵內容儲存為 `artifact_strategy_plan_v1.md` 和 `artifact_target_audience_v1.md`。[source: 53]

2.  **推動下一步：撰寫核心文案**

    - **使用者操作：**
      - 閱讀完 AI 生成的策略後，覺得內容不錯。
      - 在 Chat 介面下方點擊 `[下一步 ▶️✨]` 按鈕。[source: 24, 28, 56]
    - **App 行為：**
      - 觸發「下一步」功能，將當前 Task 的上下文 (剛完成的策略、使用的知識) 傳給 AI 進行分析。
    - **AI 行為：**
      - 分析認為，策略制定完成後，下一步合理的行動是「撰寫核心宣傳文案」。
      - 生成建議的「下一步」Prompt。
    - **App 行為：**
      - 彈出「下一步」Modal，顯示 AI 建議：[source: 38-46]
        - **建議標題：** 撰寫核心宣傳文案
        - **建議 Prompt (預填)：** "根據 `#../01-宣傳策略與目標設定/artifact_strategy_plan_v1.md`，撰寫 3 種不同風格的核心宣傳標語與簡介" (自動引用了上一步的產出物作為知識)
        - **選項：** 預設勾選 `[Create New Task ✓]`。[source: 46]
    - **使用者操作：**
      - 確認 AI 的建議合理 (或可微調 Prompt)。
      - 點擊 `[Submit]`。[source: 46]
    - **App 行為：**
      - 創建 `/(task) 02-核心宣傳文案撰寫` 資料夾。
      - 儲存 `chat_core_copy_v1.json` (包含 AI 建議的 Prompt 和 Knowledge)。
      - 自動執行這個新的 Chat。

3.  **繼續循環：生成社群貼文**

    - **AI 行為：** 生成 3 種文案選項。
    - **App 行為：** 顯示 AI 回應，使用者將其存為 `artifact_copy_option_A_v1.txt` 等檔案。
    - **使用者操作：** 選擇了文案 A，再次點擊 `[下一步 ▶️✨]`。
    - **App / AI 行為：** 分析後建議下一步是「生成社群媒體內容」。
    - **App 行為：** 彈出「下一步」Modal，預填 Prompt 如："使用 `#../02-核心宣傳文案撰寫/artifact_copy_option_A_v1.txt` 和 [提示使用者添加圖片/影片知識]，生成 5 則用於遊戲預告期的社群貼文"。
    - **使用者操作：** 添加遊戲截圖引用 (`#game_assets/screenshot1.jpg`)，確認並提交。
    - **App 行為：** 創建 `/(task) 03-社群媒體內容生成 - 預告期` 並執行...

4.  **流程持續：** 這個 "完成 -> 下一步 -> 確認/微調 -> 執行" 的循環會一直持續下去，引導使用者逐步完成新聞稿、視覺概念發想、上市週貼文等一系列宣傳任務，直到整個宣傳活動規劃完畢或執行完成。

## 此流程如何解決使用者痛點

1.  **降低啟動門檻：** 「下一步」功能主動建議後續任務，解決了「不知道下一步做什麼」或「懶得想」的問題。[source: Q4]
2.  **節省時間精力：** AI 自動生成文案、點子、草稿，大幅減少使用者從零開始所需的時間和精力。
3.  **結構化管理：** 將大型宣傳活動拆解成清晰的 Task，並以 Workspace 結構化儲存所有過程與產出，方便追蹤和管理。[source: Q5]
4.  **知識複用：** 透過 `#檔案路徑` 輕鬆引用先前的產出 (artifact) 或基礎素材 (game assets)，確保後續任務能基於之前的成果進行，保持一致性。[source: Q7]
5.  **半自動靈活性：** 使用者在每個「下一步」環節都有機會審核、修改 AI 的建議和 Prompt，保有控制權，確保產出符合需求，而非完全失控的自動化。[source: Q3, Q12]
6.  **流程可視化：** 左側 Explorer 清晰展示任務列表與狀態，讓使用者對整體進度一目了然。[source: 1]

這個流程展示了您的 App 如何作為一個主動的 AI 助手，推動使用者完成複雜的遊戲宣傳任務，同時保持了必要的靈活性和使用者控制，有效解決了目標用戶的核心痛點。
