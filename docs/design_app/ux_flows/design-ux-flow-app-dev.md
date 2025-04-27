```
# Task: App開發基本UX流程

## 1. 問題、需求

用戶碰到一個問題、需求 -> 【new task, chat mode】 task1/chat1，在 task knowledge中注入相關codes(因為每個chat都需要相關codes，以後省略) -> 與AI討論approaches
-> 作法1:【next】 -> AI分析、生成計畫: 【new task, {prompt: "...", taskKnowledge: "...", ... }】 -> 用戶確認&執行
-> 作法2: 【summarize chat】 -> #chat1_summary.md

## 2. 寫code、test

做法1:

chat mode，寫 code 
【new task 或是 copy task1, chat mode】 task2/chat1 請AI按照 #task1/chat1_summary.md 討論的結果做開發 -> AI 輸出 code.ts
-> 滿意結果，結束
-> 不滿意，調整prompt或給予修正建議 -> AI生成code -> (repeat)

chat mode，寫 test
【new task 或是 copy task2, chat mode】 task3/chat1，請AI按照 #src/code.ts (引用外部的檔案，因為source code不一定會跟task放在一起)寫test -> AI輸出test.ts -> 用戶自己跑 test
-> 滿意結果，結束
-> 不滿意，有問題 -> 【new chat】給予問題資訊、#code #test 請AI修復 -> AI生成code, test(看情況) -> (循環直到test pass)


做法2: agent mode 寫code, test
【new task, agent mode】 task2/chat1  請AI按照 #task1/chat1_summary.md 討論的結果寫code & test -> agent 自循環 -> code.ts, test.ts -> 循環直到test passed -> 用戶檢查
-> 若滿意，結束
-> 不滿意
-> 作法1. 調整初始prompt，重跑agent flow
-> 作法2. 調整prompt，跑chat，


做法1、2結束後 -> 【next】 -> AI建議commit


## 3. commit

省略


## 如何重複利用，減少作業?

假設上述的開發的folder structure:

- task:解決連線問題
- task:目前前後端地連線有這個問題 (討論)
- task:請按照討論結果開發
- task:請為code寫test
- task:請commit

若想重複利用，【copy task:解決連線問題】、修改task knowledge -> 修改需要討論的問題，得到新的解決方案 -> 後續 tasks就可以直接執行

---

說明：
【operation】 代表使用者的操作
【next】: 下一步

---

# 指示

請參考 app 設計, UI, UX設計，編寫、完善以下的 UX 流程，給予流程圖，搭配適當說明

Task：app開發基本UX流程

- 可能需要多個任務，適當的拆分任務
- 基於拆分任務，請先規劃、描述最終的 workspace structure tree
- 流程可適度簡化、省略
- 流程要清晰易懂，方便讓其他開發者閱讀
- 主要目的就是在展示這個 app 可以怎麼幫助目標用戶，解決用戶通點
- 流程圖用 mermaid 編寫
```

---

# AI輔助工作流程應用程式 - 應用開發基本UX流程

## 最終 Workspace 結構

```
/(Workspace) App開發專案
├── /(task) 🏃 需求分析與規劃
│   ├── (entrypoint) chat_需求討論.v1.json
│   ├── artifact_討論摘要.v1.md
│   └── artifact_開發規劃.v1.md
├── /(task) ⏸️ 功能設計與實作
│   ├── (entrypoint) chat_功能實作.v1.json
│   ├── artifact_code_功能.v1.ts
│   └── artifact_code_功能.v2.ts
├── /(task) ✓ 測試開發
│   ├── (entrypoint) chat_測試開發.v1.json
│   ├── artifact_test_功能.v1.ts
│   └── chat_測試修復.v1.json
└── /(task) 📋 程式碼提交與文檔
    ├── (entrypoint) chat_提交準備.v1.json
    └── artifact_commit_message.v1.md
```

## 核心UX流程圖

## 詳細UX流程說明

### 1. 需求分析與規劃

#### 1.1 創建任務與初始對話

1. 使用者在主頁點擊「+ 新聊天」按鈕
2. 彈出新聊天視窗，預設為「Chat模式」並勾選「創建新Task」
3. 使用者拖拽或引用相關程式碼檔案到聊天視窗 (系統自動添加 `#檔案路徑` 引用)
4. 使用者撰寫需求討論 Prompt：

```
<task_knowledge>
#相關程式碼.ts
</task_knowledge>

<task_instruction>
分析此功能需求並提供實作建議
</task_instruction>

我們需要實作一個新功能，要求如下：...
```

5. 使用者點擊「發送」，系統創建新的 Task 資料夾及 chat 檔案

#### 1.2 AI分析與總結

1. AI回應需求分析及建議
2. 使用者與AI進行多輪討論，釐清需求細節
3. 討論完成後，使用者點擊「Summarize ✨」按鈕
4. AI自動生成討論摘要，並存為 `artifact_討論摘要.v1.md`
5. 摘要顯示在聊天視窗中

#### 1.3 使用「下一步」功能

1. 使用者點擊「下一步 ▶️✨」按鈕
2. 系統彈出「下一步」視窗，顯示AI建議的下一步行動：

```
下一步
（AI建議）
[開始功能實作]
[設計系統架構]
[準備測試計劃]

<task_knowledge>
#artifact_討論摘要.v1.md
</task_knowledge>
<task_instruction />

請根據需求分析結果實作此功能
```

3. 使用者可以選擇或編輯AI建議，然後點擊「Submit」

### 2. 功能設計與實作

#### 2.1 Chat模式實作

1. 系統基於使用者確認的「下一步」創建新的任務
2. 新任務自動引用先前的討論摘要
3. 使用者可以補充實作細節要求：

```
請根據 #artifact_討論摘要.v1.md 中的需求實作功能，具體要求如下...
```

4. AI生成程式碼並存為 `artifact_code_功能.v1.ts`
5. 使用者在預覽區檢查程式碼
   - 若不滿意：點擊「編輯」提供修改建議，AI根據反饋生成 `artifact_code_功能.v2.ts`
   - 若滿意：點擊「下一步 ▶️✨」按鈕

#### 2.2 Agent模式實作（替代方案）

1. 在初始新聊天視窗中選擇「Agent模式」
2. 使用者提供總體目標和相關資料：

```
<task_knowledge>
#需求文件.md
#相關程式碼.ts
</task_knowledge>

請根據需求文件完成功能設計、實作和單元測試
```

3. Agent自動執行任務流程：
   - 分析需求
   - 設計解決方案
   - 實作程式碼
   - 編寫測試
   - 執行測試
   - 優化程式碼
4. 使用者檢查最終成果
   - 若不滿意：調整指示並重新執行
   - 若滿意：繼續下一個任務

### 3. 測試開發

1. 使用者確認AI建議的測試任務創建
2. 系統自動引用實作的程式碼檔案
3. 使用者撰寫測試開發Prompt：

```
請為 #artifact_code_功能.v2.ts 編寫單元測試，測試應涵蓋以下案例：...
```

4. AI生成測試代碼並存為 `artifact_test_功能.v1.ts`
5. 使用者自行運行測試
   - 若測試不通過：
     1. 使用者點擊「+ 新聊天」
     2. 使用者提供錯誤信息：`#artifact_code_功能.v2.ts #artifact_test_功能.v1.ts 測試失敗，錯誤信息：...`
     3. AI提供修復建議
     4. 循環直到測試通過
   - 若測試通過：點擊「下一步 ▶️✨」按鈕

### 4. 程式碼提交與文檔

1. 使用者確認AI建議的提交任務創建
2. 系統自動引用實作的程式碼和測試檔案
3. 使用者撰寫提交Prompt：

```
請為 #artifact_code_功能.v2.ts 和 #artifact_test_功能.v1.ts 生成適合的提交訊息
```

4. AI生成提交訊息並存為 `artifact_commit_message.v1.md`
5. 使用者可以直接使用此訊息進行程式碼提交

## 工作流重複利用

為了重複利用工作流，使用者可以：

1. 在Explorer（左側欄）找到先前完成的任務
2. 右鍵選擇「複製任務」或點擊任務旁的「⋮」選單後選擇「複製」
3. 系統復制整個任務結構，包括所有子任務和對話
4. 使用者可以修改任務知識引用和初始Prompt
5. 點擊任務旁的「▶️」按鈕執行整個任務流程

例如，复制「需求分析與規劃」任務後，使用者只需更新初始需求描述，然後點擊執行，系統會按照先前優化過的流程自動完成整個工作。

## UI交互重點

1. **快速引用檔案**：使用`#檔案路徑`語法直接在Prompt中引用檔案
2. **一鍵摘要**：使用「Summarize ✨」快速生成對話摘要並儲存
3. **智慧下一步**：「下一步 ▶️✨」按鈕減輕使用者「下一步該做什麼」的認知負擔
4. **任務執行狀態指示**：
   - ✓ - 已完成
   - 🏃 - 執行中(1/4) - 括號中顯示進度
   - ⏸️ - 暫停
   - ⚠️ - 警告/有問題
   - 🔴 - 錯誤/失敗
5. **版本控制**：每次編輯已發送的Prompt時，系統自動創建新版本（如chat1.v1.json, chat1.v2.json）

## 結論

這個UX流程設計體現了「Push not pull」的核心理念，通過AI主動推動工作流程，使用者只需在關鍵節點進行確認或決策。它特別適合應用開發過程中的階段性工作，每個階段完成後，系統自動建議下一步行動，減輕使用者的認知負擔，同時保留足夠的控制彈性。

此設計解決了現代開發者面臨的痛點：

1. 工作中斷後的「下一步該做什麼」困惑
2. 開發過程中需要不斷重新開始對話的問題
3. 檔案管理混亂，需要頻繁複製貼上的麻煩
4. 難以對AI生成結果給予具體評論的問題

通過半自動化工作流和可重複利用的任務結構，這套UX設計能顯著提升開發效率，同時保留使用者對關鍵決策的控制權。
