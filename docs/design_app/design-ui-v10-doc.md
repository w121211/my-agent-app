# AI Chat App UI Design Requirements

## Overview

A modern, professional AI chat application with a VS Code-inspired interface. The design prioritizes simplicity and functionality with a clean, dark theme UI and three-panel layout common in modern code editors.

## Layout Structure

### Three-Panel Design

- **Left Panel**: Project Explorer - File/folder management and navigation
- **Center Panel**: Chat Conversation - Message history and input area
- **Right Panel**: Context Panel - Project context, artifacts, and file previews

## Color Palette & Typography

### Colors

- Dark theme with subtle contrast between panels
- Main background: `#181A20`
- Sidebar/panel background: `#20232A`, `#23272F`
- Border colors: `#23272F`
- Text colors: `#E4E7EF` (main), `#8A8F98` (dimmed)
- Accent color: `#3B82F6`
- Selection color: `#24304B`

### Typography

- Modern sans-serif font (Inter, Segoe UI, Arial)
- Base font size: 15px
- Different weights for headings and body text

## Component Specifications

### Project Explorer (Left Panel)

- **Header**: "Projects" with toggle and menu options
- **Tree Structure**:
  - Folder nodes with expand/collapse chevron icons
  - File nodes with appropriate file icons
  - Chat files use chat bubble icons
  - Workflow folders show status indicators (running, completed, error)
- **Interactions**:
  - Hover reveals context menu buttons
  - Selected node has highlighted background
  - Files in project context display bookmark icon
  - Clicking folders expands/collapses content
  - Clicking files opens preview (except chat files)
  - Clicking chat files opens conversation
- **Footer**: Settings button

### Chat Conversation (Center Panel)

- **Header**: Breadcrumb navigation showing file path
- **Message Display**:
  - AI messages left-aligned with model name
  - User messages right-aligned with colored background
  - File references as clickable links
  - Message actions (edit, copy) visible on hover
- **Input Area**:
  - Multi-line text input
  - Left corner: Attachment and reference buttons
  - Right corner: Send button

### Context Panel (Right Panel)

- **Project Context Section**:
  - Editable text area supporting file references
  - References displayed as clickable links
  - Edit/Save toggle functionality
- **Artifacts Section**:
  - List of generated files/content
  - Preview and download options
  - "Download All" button
- **File Preview Overlay**:
  - Displays file content when selected
  - Close button to return to context panel

## Interaction Patterns

### Navigation

- Tree-based navigation for projects and files
- Breadcrumb navigation in chat header

### Selection & Hovering

- Selected items highlighted with `#24304B` background
- Hover states reveal additional action buttons
- Hover effects for clickable elements

### Actions

- Context menu buttons appear on hover
- Workflow control buttons (start/stop) for workflow folders
- Message actions visible on message hover

### Editing

- Editable project context with save/cancel options
- Edit message functionality

## Additional Notes

- Design prioritizes simplicity and functionality
- Mobile responsiveness not required in MVP
- Uses Tailwind CSS for styling and Bootstrap Icons for iconography
- Text input supports file references with # symbol

This document serves as a reference for developers implementing the chat application UI, ensuring consistency with the provided design mockup.

# Prompt log

````
<需求>
請設計一個ai chat app ui

- 整體 ui 參考: claude, gemini, grok, chatgpt
- style 參考 vs code，例如 file explorer
- MVP階段，需要基本簡約的設計，不要過度設計
- 輸出 HTML Artifacts：HTML + Tailwind CSS (使用 tailwind CSS CDN)- 使用Bootstrap Icons CDN，避免自己寫 svg
- 輸出英文
  </需求>

<修改意見>

<!-- newest first -->

請按照以下意見修改 html artifact

- 輸出英文

Project context

- 改成用text 方式呈現，例如

```txt
#<demo-project>/demo.md #/path/to/outside/file.md
Text is also allowed
```

- 允許 multiple lines，類似 user message，references 是 text button
- context 允許使用者編輯(textbox)、儲存

Project Explorer

- 在 active project 的 file node 下，如果該 file/folder node 屬於 project context，例如 `README.md`，則在該 node name 後面加上一個 icon ，用於表示該 file 已被加入 project context
- 維持 Node name 為單行，當name過長變成 multi line，例如 `design-discussion.chat.json`，超出的文字自動 omit

User message box

- `I want a chat UI that feels modern and professional, like VS Code but for conversations.` -> 改成 `I want a chat UI that feels modern and professional, like VS Code but for conversations. #vscode-screenshot.png`
- 其中 #vscode-screenshot.png 是一個 clickable text，點擊後開啟 file

Project explorer

- 每個 File/folder node 有 file menu icon button，在 selected, cursor hover 時出現
  - 參考 `claude-explorer-screenshot.png` （其中一個為 selected node, 另一個為 cursor hover）
- 每個 folder node （包括 workflow folder）有1. chat icon button （用於新增chat file） 2. file menu icon button （共通，每個node都有）

Project explorer - workflow folder

- Folder 分成兩種類型 1. 一般 folder 2. Workflow folder
- workflow folder 會在 folder name 後面加上 workflow status icon: 例如執行中、執行完、執行出現問題
- 請在 project folder 底下新增一個 workflow folder（展示用）

Hover workflow node 時，workflow status icon 的後面會出現一個 workflow control icon button，用於控制這個 workflow
Workflow 狀態為執行中 -> stop icon button，未啟動/執行完/有問題 -> start icon button

workflow folder node 右側的 icon buttons

1. 當Start/stop icon button （用於控制 workflow）
2. chat icon button （用於新增chat file）
3. file menu icon button （共通，每個node都有）

簡化 html artifact

- 例如：file preview 功能只需要用其中一個 demonstrate ，不需要每個 file 都做
- 但不要過度簡化

Conversation messages

- User message 應該要靠右，不用佔全幅
- AI meesage不需要框框

Chat prompt Input area

- Input box 做成全幅
- submit icon 改放在右下，與 attach、reference 同一區塊

Referenced Files

- 改名為 Project context
- 要有新增 （plus) 的 icon，用於新增 file
- 每個 file 要有移除 icon

Projects

- 要展示 2 個 project folders
- 其中一個 project folder 要包含 nested folders

Chat messages

- AI message box 上方要有 speaker，例如 model name 或是直接用 avatar 表示，參考 vscode copilot 的設計
- User message 不需要 speaker
- AI message box 右下方要有 edit, copy 等等的 icon buttons
- User message box 右下方要有 edit icon button

User prompt input

- 除了 submit icon，其他icon buttons 放到左下角

---

# Left

- Title 改叫 Projects
- 因為已經有個 [+] icon，底部的 add project folder 移除
- 底部的add project folder改成 settings，button 無需填色（低調，無需）

Explorer tree

- Folder node 不需要 folder emoji，只要 text
- File node 統一用最基本的 file icon（同一個），不需要刻意區分不同 file extension
  - 例外：chat file `.chat.json` 用 chat icon
- Node text 維持單一顏色，不用變色
- Selected node 要凸顯出來，參考 vscode explorer

# Center

Chat conversation panel -> 盡量參考 vscode copilot style

- 不需要 avatar icon
- message box 的顏色
- Message box 的 align
- Input prompt
- 等等

Chat conversation panel

- Header 的 `design-discussion.json • my-ai-project` -> 改成 chat file breadcrumb

# Right

Artifacts

- 要有download all icon button
- 個別 artifact 也要有 download icon button

File preview

- 點擊 explorer 上的 file ，會開啟 file preview
  - 例外：chat file
- 點擊 artifacts ，會開啟 file preview

整體 style：請從 ux、ui的角度，選擇

- 更適合的字型、字體大小
- 整體版面的顏色
  </修改意見>

目前 AI 已按照 <需求> ＆ <修改意見> 生成`design-ui-v10.html`設計稿
請參考設計稿，將 <需求> ＆ <修改意見> 整理、編寫一個 ui, ux 設計需求文件

- 只要基本、簡單易懂的文件，不用詳細，目的是為了讓開發者理解設計者的需求

<需求>
請設計一個ai chat app ui

- 整體 ui 參考: claude, gemini, grok, chatgpt
- style 參考 vs code，例如 file explorer
- MVP階段，需要基本簡約的設計，不要過度設計
- 輸出 HTML Artifacts：HTML + Tailwind CSS (使用 tailwind CSS CDN)
- 使用Bootstrap Icons CDN，避免自己寫 svg
- 輸出英文

# Layout: sidebar + workspace

- sidebar: file explorer，參考 vs code
  - root 為 project folders，允許使用者指定/增加多個 project folders
  - 除了一般的 file，有 chat.json file，代表chat file，點擊後開啟 chat
  - 一般 file，點擊後會用右欄的preview顯示(類似artifact preview)
- workspace: chat，參考 claude、gemini
  - 中欄: chat conversation (messages, user prompt input)
  - 右欄: - 底層為 chat details, 包括 project content (project referenced files), artifacts 等等 - 上層為 preview file/artifact（類似 canvas），可開啟/關閉，當開啟時會覆蓋底層，等同於疊在底層之上
    </需求>

目前已按照 <需求> 生成2份 html 設計稿
請以 `ai_chat_app.html` 為基礎，檢視有哪些部分需要優化

- 請從 ux 的角度思考
- 只要檢視＆給意見，不要修改

請繼續優化 `ai_chat_app.html`

- 只要檢視＆給意見，不要修改

請按照 <需求> 檢視生成的2份 html 設計稿，提出意見

- 只要檢視＆給意見，不要修改

請參考討論，重新設計app ui，請給多個版本的概念設計，不需要細節

- 輸出HTML Artifacts：HTML + CSS，靜態，不需要 js
- 輸出英文
- 可自由發揮

-
- 用 Tailwind CSS JIT CDN 來編譯 tailwind
- 靜態網頁，不需要 js
- 可以輸出多個 html 展示不同的區塊
- 輸出英文
````
