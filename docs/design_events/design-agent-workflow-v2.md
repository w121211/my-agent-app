# Agent 系統設計說明

## 系統基本概念

本系統建立在 AutoGen AgentChat 的基礎架構之上，設計了多個層級的組件來組織和管理工作：Project、Task、Plan、Step 和 Work。Project 作為最高層級的組織單位包含多個相關 Tasks，每個 Task 對應一個 Plan，Plan 包含具體的執行 Steps，而 Step 則產生實際的 Work 成果。

現階段我們聚焦在 Task 和 Step 的實現。雖然系統支持 Project 概念，但不實作 Project Plan 等功能，因為這類功能可以通過組織多個相關 Tasks 來實現，額外的 Project 層級功能反而會增加不必要的複雜度。

### Space 管理

系統使用 Space（工作區）來管理資源，分為 Project Space 和 Task Space 兩個層級。Task Space 存儲特定 Task 的資料，包括背景資料（Context）、Plan 和 Works。所有 Task Works 都有唯一的文件路徑，支持跨 Task 的資源調用，方便不同 Tasks 之間共享和重用資源。

## Step 執行機制

### Step 類型與執行模式

Step 根據執行模式分為四種類型：

1. 純函數執行型：不需要 Agent 參與的操作，如網頁爬蟲。可直接執行函數並記錄結果，也可選擇配置 Tool Agent 來解析前置 Work，簡化資料處理流程。

2. 純用戶操作型：只需用戶輸入或操作，系統等待用戶完成並提供結果。適用於只有用戶能提供的資訊或決策。

3. 純 Agent 操作型：由 Agent 獨立完成的工作，不需用戶確認。適合有明確規則的任務。

4. 需要用戶反饋型：需要 Agent 和用戶協作完成。採用 RoundRobinChat 模式支持多輪討論，適合需要用戶指導或確認的場景。

對於需要 Agent 參與的 Step，我們採用基於 Prompt 注入的設計。Step Assistant 使用基礎 Agent 設計，任務相關信息通過初始 Prompt 注入，這讓用戶可以靈活調整每次對話的參數。System Instruction 則保持通用性，主要定義基本的 Task Guidelines。

### Step 創建新對話機制

用戶在三種情況下可能需要創建新對話：

1. 對話過長影響效能：可創建新對話延續工作，系統自動加載 Context 和前序 Work，並提供預設 Prompt。

2. 需要調整初始 Prompt：用戶可重新設置參數並開始新對話。系統提供快捷方式加載 Context，並通過版本管理機制保留和追踪所有 Work 版本。

3. Work 需要大幅修改：用戶可直接在 Work 上編寫修改意見，然後開新對話叫 Agent 調整。系統提供相關快捷功能協助操作。

為提高效率，系統實現了多項輔助功能：
- 快捷按鈕和快捷鍵用於導入 Context
- 預設 Prompt 模板減少重複輸入
- Work 快速引用機制

## Task 管理機制

### Task 創建與規劃

Task 的創建被視為 Step 0，從用戶提供任務 Prompt 開始，Planner Agent 與用戶共同規劃出 Task Plan，用戶確認後自動開始執行。

### Task 重新規劃機制

系統採用創建新 Task 而非動態調整現有 Task Plan 的方式來處理重新規劃。這個決定基於三個考量：

1. 降低複雜度：避免處理部分完成的 Step 狀態和數據一致性等問題。

2. 保持清晰性：每個 Task 作為獨立的工作單位，便於追踪進展和版本歷史。

3. 提供靈活性：用戶可嘗試不同工作方向，同時保留原有成果。

重新規劃時，用戶可以隨時中斷當前 Task，並基於其內容創建新 Task。系統提供快捷方式導入相關資源，新 Task 雖然獨立運作，但保留來源記錄以便追溯。

### Task 狀態管理

系統通過 Dashboard 展示三類關鍵信息：

1. 執行狀態：執行中、完成、等待用戶、暫停、中斷、錯誤等。

2. Task 關聯：來源 Task、所屬 Project、使用資源等。

3. 執行進度：當前 Step、完成數量、預計工作量等。

## 數據存儲機制

系統採用細粒度的存儲策略，考慮三個面向：

1. 對話歷史完整性：即時保存每條消息（Message），支持從任何歷史點繼續或分支對話。

2. Work 版本控制：採用時間戳命名，按 Step 分類存儲，方便追溯和對比。

3. 資源共享：Task Space 統一管理資源，實現清晰的命名和組織結構，支持跨 Task 訪問。

雖然這種策略占用較多存儲空間，但提供了最大的靈活性和可追溯性，對開發調試階段特別有價值。

## 特殊情況處理

系統主要處理兩類特殊情況：

1. 大段輸出：
   - Agent 可標記未完成部分，在後續對話中繼續
   - 提供 Work 合併工具，保持版本歷史

2. 用戶修改：
   - 同時保存原始和修改版本
   - 記錄修改內容和來源
   - 支持直接使用修改後版本，標記為用戶確認

這些處理機制在保持歷史可追溯的同時，為用戶提供最大的操作靈活性。