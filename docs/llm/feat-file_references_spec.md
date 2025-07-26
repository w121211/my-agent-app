## 📎 **引用檔案 (File References) - @ 語法**

### **輸入階段：@ 觸發檔案搜尋**

**預期功能**

- 輸入 "@" 觸發檔案搜尋選單
- 支援 fuzzy search 專案檔案
- 鍵盤導航（上下鍵選擇，Enter/Tab 確認，Esc 取消）

**完成情形**

- ❌ **完全未實現** - 這是最關鍵的功能缺失
- 目前輸入框是純 textarea，無任何搜尋觸發邏輯

### **顯示階段：已引用檔案的視覺呈現**

**完成情形**

- ✅ 已引用檔案顯示為可點擊連結（目前使用 # 符號）
- ❌ 點擊檔案引用的互動功能尚未實現（僅顯示 toast 提示）
- ❌ 檔案狀態指示（檔案不存在、已更新等）尚未實現

### **後端處理：MessageProcessingService**

**完成情形**

- ❌ **完全未實現** - 規劃中的統一訊息處理管道不存在
- ❌ 檔案內容注入邏輯（`@{file_path}` → 檔案內容）尚未實現

---

# File References (@syntax) Design Specification

## Overview

File References feature enables users to reference project files in chat messages using `@filename` syntax. This design follows MVP principles, leveraging existing event-core architecture while introducing minimal complexity.

## Backend Design

### Architecture Strategy

**Core Principle**: Extend existing services rather than creating new heavyweight components. Use utility functions instead of complex service classes to maintain simplicity.

### Service Extensions

#### ProjectFolderService Enhancement

**WHY**: File search is fundamentally about "searching within project scope" - a natural extension of existing project management responsibilities.

```typescript
// Extension to existing ProjectFolderService
interface ProjectFolderService {
  // New method added
  searchFilesInProject(
    query: string,
    projectId: string,
    limit?: number,
  ): Promise<FileSearchResult[]>;

  // Existing methods remain unchanged
  getFolderTree(projectPath: string): Promise<FolderTreeNode>;
  // ...
}

interface FileSearchResult {
  name: string; // "world.txt"
  relativePath: string; // "docs/world.txt"
  absolutePath: string; // "/project/docs/world.txt"
  score?: number; // fuzzy search relevance
  highlight?: string; // highlighted text for UI
}
```

**Implementation Strategy**:

- Leverage existing `folderTrees` data structure
- Use `fuzzysort` library for search capability
- Integrate with existing `FileWatcherService` for auto-sync
- Search only within current project scope

#### ChatService Integration

**WHY**: File reference processing is part of message handling flow, not a separate concern requiring its own service.

```typescript
// Enhanced ChatService.submitMessage flow
async submitMessage(chatId: string, message: string, attachments?, correlationId?) {
  // 1. Process file references (new step)
  const processedMessage = await this.processFileReferences(message, chat)

  // 2. Continue with existing flow
  const chatMessage = { id, role: "USER", content: processedMessage, timestamp }
  await this.chatRepository.addMessage(...)
  await this.processUserMessage(updatedChat, chatMessage, correlationId)
}

// New private methods
private async processFileReferences(message: string, chat: Chat): Promise<string>
private async loadFileContents(fileRefs: string[], projectPath: string): Promise<Map<string, string>>
```

### Message Processing Utilities

**WHY**: Replacing planned MessageProcessingService with stateless utility functions aligns with functional programming principles and reduces complexity.

```typescript
// message-processing-utils.ts - Pure functions
export function extractFileReferences(message: string): string[];
export function processFileReferences(
  message: string,
  fileContentMap: Map<string, string>,
  projectPath: string,
): string;

// Future extensions
export function processInputDataPlaceholders(
  message: string,
  inputData: Record<string, any>,
): string;
export function extractToolCalls(message: string): ToolCall[];
```

**Processing Strategy**:

- Raw Message: `"hello @world.txt continues"`
- Processed Message: `"hello <file data-path=\"world.txt\">{{file content}}</file> continues"`
- Error Handling: File not found → keep original `@world.txt` (silent failure)

### API Design

#### tRPC Router Extension

```typescript
// Extend existing projectFolder router
export const projectFolderRouter = router({
  // Existing methods...

  searchFiles: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        projectId: z.string(),
        limit: z.number().optional().default(20),
      }),
    )
    .query(async ({ input }) => {
      return projectFolderService.searchFilesInProject(
        input.query,
        input.projectId,
        input.limit,
      );
    }),
});
```

### Data Flow Architecture

```
User Input "@wor"
    ↓
Frontend triggers projectFolder.searchFiles.query("wor", projectId)
    ↓
ProjectFolderService.searchFilesInProject()
    ↓
Search within existing folderTrees using fuzzysort
    ↓
Return FileSearchResult[] with relevance scores
    ↓
Frontend displays search menu

User sends "hello @world.txt continues"
    ↓
ChatService.submitMessage()
    ↓
MessageProcessingUtils.extractFileReferences() → ["world.txt"]
    ↓
ChatService.loadFileContents() via FileService.openFile()
    ↓
MessageProcessingUtils.processFileReferences() → processed message
    ↓
Send processed message to AI API
    ↓
Save original message to chat file
```

## Frontend Design

### Architecture Strategy

**Core Principle**: Minimize component complexity while maintaining good user experience. Focus on 80% use cases with 20% implementation effort.

### Component Responsibility

#### ChatInput Component (Primary Modification)

**WHY**: Centralize @ syntax logic in single component to avoid cross-component state synchronization complexity.

```typescript
// ChatInput internal state management
interface ChatInputState {
  searchQuery: string; // Current search term
  searchResults: FileResult[]; // Search results from API
  showSearchMenu: boolean; // Menu visibility
  selectedIndex: number; // Keyboard navigation selection
}
```

**Responsibilities**:

- Detect @ trigger and extract search query
- Manage search menu state and visibility
- Handle keyboard navigation (up/down, enter, escape)
- Process file selection and text replacement

#### FileSearchDropdown Component (New Addition)

**WHY**: Pure presentation component following single responsibility principle.

```typescript
// FileSearchDropdown interface
interface FileSearchDropdownProps {
  results: FileSearchResult[];
  selectedIndex: number;
  onSelect: (file: FileSearchResult) => void;
  onCancel: () => void;
  visible: boolean;
}
```

**Responsibilities**:

- Display search results with highlighting
- Handle mouse interactions
- Render "no results found" state
- No internal state management

#### Message Rendering (Minimal Changes)

**WHY**: Leverage existing file reference display logic, only adding color differentiation.

**Enhancement**:

- Existing files: Display `@file.txt` in blue color
- Missing files: Display `@missing.txt` in normal text color
- Logic: Positive indication for success, no special handling for failures

### User Interaction Flow

#### @ Trigger Mechanism

```
User types: "hello" → "hello @" → "hello @w" → "hello @wo"
    ↓
System response: Show all files → Filter by "w" → Filter by "wo"
```

#### File Selection Process

```
User input: "hello @wo"
User selects: "world.txt" from dropdown
Result: "hello @world.txt " (auto-append space)
Cursor position: After the space for continued typing
```

#### Keyboard Navigation

- **Up/Down arrows**: Navigate through search results
- **Enter/Tab**: Confirm selection
- **Escape**: Cancel search menu
- **Continue typing**: Update search criteria

### Technical Implementation Strategy

#### Text Parsing - Ultra-MVP Approach

**Scope Limitation**: Only support cursor-at-end scenarios to avoid complexity.

```
✅ Supported: "hello @wo[cursor]"
❌ Not supported: "hello @wo[cursor]rld @file"
❌ Not supported: Multi-line complex scenarios
```

**Detection Logic**:

```typescript
// Simplified detection algorithm
function detectFileReference(value: string, cursorPos: number) {
  // Only process if cursor is at end
  if (cursorPos !== value.length) return null;

  // Find last @ symbol
  const lastAtIndex = value.lastIndexOf("@");
  if (lastAtIndex === -1) return null;

  // Extract text after @
  const afterAt = value.slice(lastAtIndex + 1);
  if (afterAt.includes(" ")) return null; // No spaces allowed

  return afterAt; // This becomes the search query
}
```

#### Search Menu Positioning

**MVP Strategy**: Fixed position below textarea to avoid complex cursor-following logic.

**Rationale**: Simplifies implementation while providing acceptable user experience for initial version.

#### Search Optimization

- **Debouncing**: 300ms delay to balance responsiveness with API load
- **Caching**: Short-term result caching for repeated searches
- **Fuzzy Search**: Use `fuzzysort` library for intelligent file matching

### Error Handling Strategy

#### File Status Indication

**Philosophy**: Positive indication for success states, neutral handling for failures.

- **Existing files**: Blue color indicates successful reference
- **Missing files**: Normal text color (no special error styling)
- **No results**: Display "No files found" message while keeping menu open

#### Graceful Degradation

- **Feature flag**: Wrap @ search functionality for easy disable
- **Fallback behavior**: If search fails, @ syntax still works as plain text
- **Backward compatibility**: Existing file reference display unchanged
